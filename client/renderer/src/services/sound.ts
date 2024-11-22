import championList from '../../public/assets/champions.json';
let _audio: HTMLAudioElement | null = null;

export function playSound(url: string) {
    if (_audio) {
        _audio.pause();
    } else {
        _audio = new Audio();
    }
    _audio.src = url;
    _audio.play();
}

export function playSoundByChampionIdx(championIdx: number) {
    if (championIdx < 0 || championIdx >= championList.length) return;

    const url = championList[championIdx]?.pickSoundURL;
    if (url) playSound(url);
}