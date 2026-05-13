declare module 'use-sound' {
    export default function useSound(
        src: string | string[],
        options?: any
    ): [() => void, { stop: () => void; pause: () => void; duration: number | null; sound: any }];
}
