import {
    streamText,
    UIMessage,
    convertToModelMessages,
    createUIMessageStreamResponse,
    toUIMessageStream,
} from 'ai';
import { openai } from "@ai-sdk/openai";

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
        model: openai('gpt-4o-mini'),
        messages: await convertToModelMessages(messages),
    });

    return createUIMessageStreamResponse({
        stream: toUIMessageStream({ stream: result.stream }),
    });
}