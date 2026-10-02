import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
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

type Message = {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
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
const WELCOME: Message = {
  role: 'assistant',
  content: 'Ask a question about Indian law. I will search the legal sources and show the passages used.',
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isLoading]);

  async function submitQuestion() {
    const query = draft.trim();
    if (!query || isLoading) return;

    setDraft('');
    setError(undefined);
    setMessages((current) => [...current, { role: 'user', content: query }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error(`The server returned ${response.status}.`);
      }

      const result = (await response.json()) as QueryResponse;
      setSessionId(result.session_id);
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: result.answer, citations: result.citations },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to reach LawGlance.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>LAWGLANCE</Text>
            <Text style={styles.title}>Legal clarity, grounded in sources.</Text>
          </View>
          <View style={styles.statusDot} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message, index) => (
            <View
              key={`${message.role}-${index}`}
              style={message.role === 'user' ? styles.userMessage : styles.assistantMessage}
            >
              <Text style={styles.messageLabel}>
                {message.role === 'user' ? 'YOU' : 'LAWGLANCE'}
              </Text>
              <Text style={styles.messageText}>{message.content}</Text>
              {message.citations?.map((citation) => (
                <View style={styles.citation} key={`${citation.number}-${citation.label}`}>
                  <Text style={styles.citationTitle}>[{citation.number}] {citation.label}</Text>
                  <Text style={styles.citationSnippet}>{citation.snippet}</Text>
                </View>
              ))}
            </View>
          ))}
          {isLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#d9a441" />
              <Text style={styles.loadingText}>Searching legal sources...</Text>
            </View>
          )}
        </ScrollView>

        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submitQuestion}
            placeholder="Ask a legal question..."
            placeholderTextColor="#7f8b91"
            style={styles.input}
            multiline
            maxLength={2000}
          />
          <Pressable
            accessibilityLabel="Send question"
            disabled={!draft.trim() || isLoading}
            onPress={submitQuestion}
            style={({ pressed }) => [
              styles.sendButton,
              (!draft.trim() || isLoading) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
          >
            <Text style={styles.sendText}>SEND</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#10252b',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#294149',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#d9a441',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 7,
  },
  title: {
    color: '#f3eee4',
    fontSize: 22,
    fontWeight: '700',
    maxWidth: 300,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7db49a',
    marginTop: 4,
  },
  messageList: {
    padding: 18,
    gap: 14,
    flexGrow: 1,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#d9a441',
    padding: 15,
    maxWidth: '88%',
    borderRadius: 4,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#19343c',
    padding: 16,
    maxWidth: '94%',
    borderLeftWidth: 3,
    borderLeftColor: '#d9a441',
  },
  messageLabel: {
    color: '#a8bcc0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  messageText: {
    color: '#f3eee4',
    fontSize: 16,
    lineHeight: 24,
  },
  citation: {
    borderTopWidth: 1,
    borderTopColor: '#31515a',
    marginTop: 14,
    paddingTop: 10,
  },
  citationTitle: {
    color: '#d9a441',
    fontSize: 12,
    fontWeight: '700',
  },
  citationSnippet: {
    color: '#b7c7c9',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  loadingText: {
    color: '#a8bcc0',
    fontSize: 13,
  },
  error: {
    color: '#f0a28d',
    fontSize: 13,
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  composer: {
    backgroundColor: '#19343c',
    borderTopWidth: 1,
    borderTopColor: '#294149',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    backgroundColor: '#10252b',
    color: '#f3eee4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#31515a',
    borderRadius: 3,
  },
  sendButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#d9a441',
    borderRadius: 3,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonPressed: {
    opacity: 0.75,
  },
  sendText: {
    color: '#10252b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
