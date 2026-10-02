import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
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

export default function App() {
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [sessionId, setSessionId] = useState<string>();
  const [isAnswerScreen, setIsAnswerScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [isFocused, setIsFocused] = useState(false);

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
        body: JSON.stringify({ query, session_id: sessionId }),
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

  function startOver() {
    setQuestion('');
    setSubmittedQuestion('');
    setAnswer('');
    setCitations([]);
    setError(undefined);
    setIsAnswerScreen(false);
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
          <Text style={styles.headline}>Tell us what happened.</Text>
          <Text style={styles.subtext}>
            Explain your situation in your own words. We will help you understand what to do next.
          </Text>

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
  footnote: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 14 },
  pressed: { opacity: 0.75 },
});
