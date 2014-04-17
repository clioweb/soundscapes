
declare class WaveSurfer {
    drawer: Drawer;

    constructor();
    init(config: Object);
    playPause();
    play();
    on(event: string, handler: Function);
    un: {
        (event: string, handler: Function);
        (event: string);
    };
    once(event: string, handler: Function);
    load(url: string);
    loadBuffer(data: any);
}

declare class Drawer {
    container: HTMLElement;
    clearWave(): void;
}

