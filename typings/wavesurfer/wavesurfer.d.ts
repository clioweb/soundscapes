
declare class WaveSurfer {
  constructor();
  init(config: Object);
  playPause();
  play();
  on(event: string, handler: Function);
  load(url: string);
}

