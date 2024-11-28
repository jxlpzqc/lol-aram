import championList from '@renderer/public/assets/champions.json';
let _audio: HTMLAudioElement | null = null;

let _volume = 50;

export function setVolume(v: number) {
    _volume = v;
    if (_audio) {
        _audio.volume = v / 100;
    }
}

export function playSound(url: string) {
    if (_audio) {
        _audio.pause();
    } else {
        _audio = new Audio();
    }
    _audio.volume = _volume / 100;
    _audio.src = url;
    _audio.play();
}

export function playSoundByChampionIdx(championIdx: number) {
    if (championIdx < 0 || championIdx >= championList.length) return;

    const url = championList[championIdx]?.pickSoundURL;
    if (url) playSound(url);
}