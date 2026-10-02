import { StatusBar } from 'expo-status-bar';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Citation = {
  number: number;
  label: string;
  snippet: string;
  source?: string;
};

type QueryResponse = {
  answer: string;
  citations: Citation[];
  session_id: string;
};

type Lawyer = {
  id: string;
  display_name: string;
  years_of_experience: number;
  specializations: string[];
  practice_areas: string[];
  languages: string[];
  consultation_modes: string[];
  consultation_fee_inr: { amount: number; note: string };
  availability: { days: string[]; hours: string; next_available_slot: string };
  verification: { status: string; verified: boolean };
};

const LANGUAGES = [
  { name: 'English', locale: 'en-US' },
  { name: 'Hindi', locale: 'hi-IN' },
  { name: 'Malayalam', locale: 'ml-IN' },
  { name: 'Tamil', locale: 'ta-IN' },
  { name: 'Telugu', locale: 'te-IN' },
  { name: 'Kannada', locale: 'kn-IN' },
  { name: 'Bengali', locale: 'bn-IN' },
  { name: 'Marathi', locale: 'mr-IN' },
] as const;

const API_URL =
  Platform.OS === 'web'
    ? process.env.EXPO_PUBLIC_WEB_API_URL ?? 'http://127.0.0.1:8001'
    : process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8001';

const QUICK_STARTS = [
  "My landlord won't return my deposit after I moved out...",
  'My manager keeps sending inappropriate messages at work...',
  'I paid for a service but the seller will not provide a refund...',
];

function cleanAnswer(answer: string) {
  return answer.split(/\n\s*Sources\s*:/i)[0].trim();
}

function getInitials(displayName: string) {
  return displayName
    .replace(/^Adv\.\s*/i, '')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character);
}

export default function App() {
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [sessionId, setSessionId] = useState<string>();
  const [isAnswerScreen, setIsAnswerScreen] = useState(false);
  const [isLawyerDirectory, setIsLawyerDirectory] = useState(false);
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [lawyerSearch, setLawyerSearch] = useState('');
  const [lawyersLoading, setLawyersLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]['name']>('English');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string>();
  const [isFocused, setIsFocused] = useState(false);
  const voiceBase = useRef('');
  const whisperRecorder = useRef<MediaRecorder | null>(null);
  const whisperStream = useRef<MediaStream | null>(null);
  const whisperChunks = useRef<Blob[]>([]);

  useSpeechRecognitionEvent('start', () => setIsListening(true));
  useSpeechRecognitionEvent('end', () => setIsListening(false));
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript?.trim();
    if (transcript) {
      setQuestion(`${voiceBase.current} ${transcript}`.trim());
    }
  });
  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    if (event.error !== 'aborted') {
      const errorMessages: Record<string, string> = {
        'not-allowed': 'Allow microphone access in your browser settings, then try again.',
        'service-not-allowed': 'Speech recognition is not available in this browser. Try Chrome or Edge.',
        'language-not-supported': `${language} voice input is not supported on this device. Try English.`,
        network: 'The speech service could not be reached. Check your connection and try again.',
        'no-speech': 'No speech was detected. Tap Speak and try again.',
      };
      setError(errorMessages[event.error] ?? 'Voice input failed. You can type your question instead.');
    }
  });

  async function toggleVoiceInput() {
    if (isListening) {
      if (Platform.OS === 'web') {
        whisperRecorder.current?.stop();
      } else {
        ExpoSpeechRecognitionModule.stop();
      }
      return;
    }

    setError(undefined);
    voiceBase.current = question.trim();
    if (Platform.OS === 'web') {
      await startWhisperRecording();
      return;
    }

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError('Microphone permission is needed for voice input.');
      return;
    }

    const selectedLanguage = LANGUAGES.find((item) => item.name === language) ?? LANGUAGES[0];
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    ExpoSpeechRecognitionModule.start({
      lang: selectedLanguage.locale,
      interimResults: true,
      continuous: false,
      addsPunctuation: true,
      contextualStrings: ['BNS', 'BNSS', 'BSA', 'POSH', 'FIR', 'IPC'],
    });
  }

  async function startWhisperRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Whisper voice input needs a browser with microphone recording support.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      whisperStream.current = stream;
      whisperRecorder.current = recorder;
      whisperChunks.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) whisperChunks.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        whisperStream.current = null;
        whisperRecorder.current = null;
        setIsListening(false);
        const recording = new Blob(whisperChunks.current, { type: mimeType });
        if (!recording.size) return;

        const formData = new FormData();
        formData.append('audio', recording, 'voice.webm');
        formData.append('language', language);
        try {
          const response = await fetch(`${API_URL}/transcribe`, {
            method: 'POST',
            body: formData,
          });
          if (!response.ok) {
            const detail = (await response.json().catch(() => null))?.detail;
            throw new Error(detail || 'Whisper could not transcribe the recording.');
          }
          const result = (await response.json()) as { text: string };
          if (result.text) setQuestion(`${voiceBase.current} ${result.text}`.trim());
        } catch (requestError) {
          setError(requestError instanceof Error ? requestError.message : 'Whisper transcription failed.');
        }
      };
      recorder.start();
      setIsListening(true);
    } catch {
      setError('Allow microphone access to use Whisper voice input.');
    }
  }

  async function getAnswer() {
    const query = question.trim();
    if (!query || isLoading) return;

    setError(undefined);
    setSubmittedQuestion(query);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, session_id: sessionId, language }),
      });

      if (!response.ok) {
        throw new Error(`The service returned ${response.status}. Try again.`);
      }

      const result = (await response.json()) as QueryResponse;
      setSessionId(result.session_id);
      setAnswer(cleanAnswer(result.answer));
      setCitations(result.citations ?? []);
      setIsAnswerScreen(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The answer could not be loaded. Check your connection and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function openLawyerDirectory() {
    setError(undefined);
    setIsLawyerDirectory(true);
    if (lawyers.length > 0) return;

    setLawyersLoading(true);
    try {
      const response = await fetch(`${API_URL}/lawyers`);
      if (!response.ok) throw new Error('The lawyer directory could not be loaded.');
      const result = (await response.json()) as { lawyers: Lawyer[] };
      setLawyers(result.lawyers);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The lawyer directory could not be loaded.');
    } finally {
      setLawyersLoading(false);
    }
  }

  function startOver() {
    setQuestion('');
    setSubmittedQuestion('');
    setAnswer('');
    setCitations([]);
    setError(undefined);
    setIsAnswerScreen(false);
  }

  function exportAnswerAsPdf() {
    if (Platform.OS !== 'web') {
      setError('PDF export is currently available in the web app.');
      return;
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=800,height=900');
    if (!printWindow) {
      setError('Allow pop-ups to export this answer as a PDF.');
      return;
    }

    const sourceMarkup = citations.length > 0
      ? `<h2>Sources</h2><ul>${citations.map((citation) => `<li><strong>[${citation.number}] ${escapeHtml(citation.label)}</strong><br>${escapeHtml(citation.snippet)}</li>`).join('')}</ul>`
      : '';
    printWindow.document.write(`
      <!doctype html>
      <html><head><title>LawGlance answer</title>
      <style>
        body { font-family: Georgia, serif; color: #17191C; max-width: 720px; margin: 48px auto; padding: 0 28px; line-height: 1.6; }
        h1 { font-size: 28px; margin-bottom: 8px; }
        h2 { font-family: Arial, sans-serif; font-size: 16px; margin-top: 28px; }
        .question { color: #5F656D; font-family: Arial, sans-serif; }
        .answer { white-space: pre-wrap; font-family: Arial, sans-serif; }
        li { margin: 12px 0; font-family: Arial, sans-serif; }
        .note { color: #5F656D; border-top: 1px solid #DCDDD8; padding-top: 16px; font: 13px Arial, sans-serif; }
      </style></head><body>
      <h1>LawGlance</h1>
      <p class="question"><strong>Your question</strong><br>${escapeHtml(submittedQuestion)}</p>
      <h2>Answer</h2><div class="answer">${escapeHtml(answer)}</div>
      ${sourceMarkup}
      <p class="note">General guidance, not a lawyer's advice.</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  }

  const filteredLawyers = lawyers.filter((lawyer) => {
    const searchText = lawyerSearch.trim().toLowerCase();
    if (!searchText) return true;
    return [
      lawyer.display_name,
      ...lawyer.specializations,
      ...lawyer.practice_areas,
      ...lawyer.languages,
    ].some((value) => value.toLowerCase().includes(searchText));
  });

  if (isLawyerDirectory) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.directoryScreen} keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityLabel="Back to legal question"
            onPress={() => setIsLawyerDirectory(false)}
            style={styles.backLink}
          >
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.headline}>Find a lawyer.</Text>
          <Text style={styles.subtext}>Browse a demo directory by name, language, or legal issue.</Text>
          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeTitle}>Demo listings only</Text>
            <Text style={styles.demoNoticeText}>
              These names, fees, contact details, and availability are fictional placeholders and are not verified.
            </Text>
          </View>
          <TextInput
            value={lawyerSearch}
            onChangeText={setLawyerSearch}
            placeholder="Search landlord, cybercrime, Hindi..."
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            accessibilityLabel="Search lawyers"
          />
          {lawyersLoading && <ActivityIndicator color={colors.ink} style={styles.directoryLoading} />}
          {!lawyersLoading && filteredLawyers.map((lawyer) => (
            <View key={lawyer.id} style={styles.lawyerItem}>
              <View style={styles.lawyerProfileRow}>
                <View style={styles.avatar} accessibilityLabel={`${lawyer.display_name} profile avatar`}>
                  <Text style={styles.avatarText}>{getInitials(lawyer.display_name)}</Text>
                </View>
                <View style={styles.lawyerDetails}>
                  <View style={styles.lawyerHeading}>
                    <Text style={styles.lawyerName}>{lawyer.display_name}</Text>
                    <Text style={styles.demoTag}>Demo</Text>
                  </View>
                  <Text style={styles.lawyerMeta}>{lawyer.years_of_experience} years experience</Text>
                  <Text style={styles.lawyerAreas}>{lawyer.specializations.slice(0, 2).join(' · ')}</Text>
                  <Text style={styles.lawyerMeta}>Speaks {lawyer.languages.join(', ')}</Text>
                  <Text style={styles.lawyerMeta}>
                    From INR {lawyer.consultation_fee_inr.amount} · {lawyer.consultation_modes.join(', ')}
                  </Text>
                  <Text style={styles.lawyerAvailability}>
                    Next demo slot: {new Date(lawyer.availability.next_available_slot).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          {!lawyersLoading && filteredLawyers.length === 0 && (
            <Text style={styles.emptyDirectory}>No demo lawyers match that search.</Text>
          )}
          <Text style={styles.footnote}>This directory is for UI demonstration only.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isAnswerScreen) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.answerScreen}>
          <Pressable accessibilityLabel="Go back" onPress={startOver} style={styles.backLink}>
            <Text style={styles.backChevron}>‹</Text>
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.questionLabel}>Your question</Text>
          <Text style={styles.question}>{submittedQuestion}</Text>
          <Text style={styles.answerHeading}>Here is where you stand.</Text>
          <Text style={styles.answer}>{answer}</Text>

          <Pressable
            accessibilityLabel="Export answer as PDF"
            onPress={exportAnswerAsPdf}
            style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}
          >
            <Text style={styles.exportButtonText}>Export as PDF</Text>
          </Pressable>

          {citations.length > 0 && (
            <View style={styles.sources}>
              <Text style={styles.sourcesHeading}>Sources</Text>
              {citations.map((citation) => (
                <View key={`${citation.number}-${citation.label}`} style={styles.sourceRow}>
                  <Text style={styles.sourceLabel}>[{citation.number}] {citation.label}</Text>
                  <Text style={styles.sourceSnippet}>{citation.snippet}</Text>
                </View>
              ))}
            </View>
          )}

          <Pressable
            accessibilityLabel="Ask another question"
            onPress={startOver}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>Ask another question</Text>
          </Pressable>
          <Text style={styles.footnote}>
            General guidance, not a lawyer's advice.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.homeScreen} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>LawGlance</Text>
          <Pressable onPress={openLawyerDirectory} style={styles.directoryLink} accessibilityLabel="Find a lawyer">
            <Text style={styles.directoryLinkText}>Find a lawyer <Text style={styles.directoryLinkArrow}>→</Text></Text>
          </Pressable>
          <Text style={styles.headline}>Tell us what happened.</Text>
          <Text style={styles.subtext}>
            Explain your situation in your own words. We will help you understand what to do next.
          </Text>

          <Text style={styles.controlLabel}>Answer language</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languageRow}>
            {LANGUAGES.map((item) => (
              <Pressable
                key={item.name}
                accessibilityRole="button"
                accessibilityState={{ selected: language === item.name }}
                onPress={() => setLanguage(item.name)}
                style={[styles.languageChip, language === item.name && styles.languageChipSelected]}
              >
                <Text style={[styles.languageChipText, language === item.name && styles.languageChipTextSelected]}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={[styles.inputBlock, isFocused && styles.inputBlockFocused]}>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={QUICK_STARTS[0]}
              placeholderTextColor="rgba(23, 25, 28, 0.62)"
              style={styles.questionInput}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />
            <Pressable
              accessibilityLabel={isListening ? 'Stop voice input' : 'Speak your question'}
              onPress={toggleVoiceInput}
              style={({ pressed }) => [styles.voiceButton, pressed && styles.pressed]}
            >
              <Text style={styles.voiceButtonText}>{isListening ? 'Stop' : 'Whisper'}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Get answer"
              disabled={!question.trim() || isLoading}
              onPress={getAnswer}
              style={({ pressed }) => [
                styles.inputButton,
                (!question.trim() || isLoading) && styles.disabledButton,
                pressed && styles.pressed,
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.bg} />
              ) : (
                <Text style={styles.inputButtonText}>Get answer</Text>
              )}
            </Pressable>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.quickStarts}>
            {QUICK_STARTS.slice(1).map((prompt) => (
              <Pressable
                key={prompt}
                onPress={() => setQuestion(prompt)}
                style={({ pressed }) => [styles.quickRow, pressed && styles.quickRowPressed]}
              >
                <Text style={styles.quickText}>{prompt}</Text>
                <Text style={styles.quickPlus}>+</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <Text style={styles.homeFootnote}>Private by default. General guidance, not a lawyer's advice.</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const colors = {
  bg: '#FAFAF8',
  ink: '#17191C',
  muted: '#5F656D',
  line: '#DCDDD8',
  accent: '#F4B400',
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1 },
  homeScreen: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 32,
  },
  directoryLink: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', marginBottom: 24 },
  directoryLinkText: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  directoryLinkArrow: { color: colors.muted, fontSize: 18 },
  brand: {
    color: colors.ink,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 22,
    marginBottom: 36,
  },
  headline: {
    color: colors.ink,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 42,
    lineHeight: 45,
    marginBottom: 14,
  },
  subtext: { color: colors.muted, fontSize: 17, lineHeight: 25, marginBottom: 34 },
  controlLabel: { color: colors.muted, fontSize: 14, marginBottom: 10 },
  languageRow: { gap: 8, paddingBottom: 24 },
  languageChip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageChipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  languageChipText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  languageChipTextSelected: { color: colors.bg },
  inputBlock: {
    backgroundColor: colors.accent,
    borderRadius: 22,
    padding: 20,
    paddingBottom: 16,
    minHeight: 220,
  },
  inputBlockFocused: {
    borderWidth: 3,
    borderColor: colors.ink,
    padding: 17,
    paddingBottom: 13,
  },
  questionInput: { color: colors.ink, fontSize: 19, lineHeight: 27, minHeight: 132, padding: 0 },
  voiceButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.ink,
    justifyContent: 'center',
    marginBottom: 10,
  },
  voiceButtonText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  inputButton: {
    alignSelf: 'flex-end',
    minHeight: 48,
    minWidth: 128,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputButtonText: { color: colors.bg, fontSize: 16, fontWeight: '600' },
  disabledButton: { opacity: 0.45 },
  quickStarts: { marginTop: 32 },
  quickRow: {
    minHeight: 66,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: 18,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickRowPressed: { opacity: 0.6 },
  quickText: { color: colors.ink, fontSize: 17, lineHeight: 24, flex: 1, paddingRight: 16 },
  quickPlus: { color: colors.muted, fontSize: 24, fontWeight: '300' },
  error: { color: colors.ink, fontSize: 14, lineHeight: 20, marginTop: 14 },
  homeFootnote: { color: colors.muted, fontSize: 14, textAlign: 'center', paddingHorizontal: 24, paddingBottom: 14 },
  answerScreen: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  directoryScreen: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  demoNotice: { backgroundColor: colors.accent, borderRadius: 16, padding: 16, marginBottom: 18 },
  demoNoticeTitle: { color: colors.ink, fontSize: 16, fontWeight: '700', marginBottom: 5 },
  demoNoticeText: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  searchInput: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: colors.ink,
    fontSize: 16,
    marginBottom: 18,
  },
  directoryLoading: { marginVertical: 24 },
  lawyerItem: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 20 },
  lawyerProfileRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.bg, fontSize: 17, fontWeight: '700' },
  lawyerDetails: { flex: 1, minWidth: 0 },
  lawyerHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  lawyerName: { color: colors.ink, fontSize: 20, fontWeight: '600', flex: 1 },
  demoTag: { color: colors.muted, fontSize: 12, fontWeight: '700', borderWidth: 1, borderColor: colors.line, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  lawyerMeta: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 5 },
  lawyerAreas: { color: colors.ink, fontSize: 16, lineHeight: 23, marginTop: 8 },
  lawyerAvailability: { color: colors.ink, fontSize: 14, lineHeight: 20, marginTop: 8 },
  emptyDirectory: { color: colors.muted, fontSize: 16, paddingVertical: 28, textAlign: 'center' },
  backLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  backChevron: { color: colors.muted, fontSize: 28, lineHeight: 28, marginRight: 7 },
  backText: { color: colors.muted, fontSize: 16 },
  questionLabel: { color: colors.muted, fontSize: 14, marginBottom: 8 },
  question: { color: colors.ink, fontSize: 19, lineHeight: 27, marginBottom: 34 },
  answerHeading: {
    color: colors.ink,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 30,
    lineHeight: 34,
    marginBottom: 14,
  },
  answer: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  sources: { marginTop: 32 },
  sourcesHeading: { color: colors.ink, fontSize: 19, fontWeight: '600', paddingBottom: 14 },
  sourceRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 14 },
  sourceLabel: { color: colors.ink, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  sourceSnippet: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  primaryButton: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
  },
  primaryButtonText: { color: colors.bg, fontSize: 16, fontWeight: '600' },
  exportButton: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  exportButtonText: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  footnote: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 14 },
  pressed: { opacity: 0.75 },
});
