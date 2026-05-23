declare module 'use-sound' {
    type UseSoundOptions = Record<string, unknown>;
    type SoundControls = {
        stop: () => void;
        pause: () => void;
        duration: number | null;
        sound: unknown;
    };

    export default function useSound(
        src: string | string[],
        options?: UseSoundOptions
    ): [() => void, SoundControls];
}
