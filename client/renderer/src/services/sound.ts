import championList from '@renderer/public/assets/champions.json';
let _soundAudio: HTMLAudioElement | null = null;
let _musicAudio: HTMLAudioElement | null = null;
let _pickSoundAudio: HTMLAudioElement | null = null;

const DEFAULT_VOLUME = 50;

export function setVolume(v: {
  soundVolume?: number;
  musicVolume?: number;
  pickSoundVolume?: number;
}) {
  if (_soundAudio && v.soundVolume !== undefined) {
    _soundAudio.volume = v.soundVolume / 100;
    localStorage.setItem('soundVolume', v.soundVolume.toString());
  }
  if (_musicAudio && v.musicVolume !== undefined) {
    _musicAudio.volume = v.musicVolume / 100;
    localStorage.setItem('musicVolume', v.musicVolume.toString());
  }
  if (_pickSoundAudio && v.pickSoundVolume !== undefined) {
    _pickSoundAudio.volume = v.pickSoundVolume / 100;
    localStorage.setItem('pickSoundVolume', v.pickSoundVolume.toString());
  }
}

function getOrLazyInitAudio(track: 'sound' | 'music' | 'pickSound') {
  let audio;
  switch (track) {
    case 'sound':
      if (!_soundAudio) {
        _soundAudio = new Audio();
        _soundAudio.volume = localStorage.getItem('soundVolume') ? Number(localStorage.getItem('soundVolume')) / 100 : DEFAULT_VOLUME / 100;
      }
      audio = _soundAudio;
      break;

    case 'music':
      if (!_musicAudio) {
        _musicAudio = new Audio();
        _musicAudio.volume = localStorage.getItem('musicVolume') ? Number(localStorage.getItem('musicVolume')) / 100 : DEFAULT_VOLUME / 100;
      }
      audio = _musicAudio;
      break;

    case 'pickSound':
      if (!_pickSoundAudio) {
        _pickSoundAudio = new Audio();
        _pickSoundAudio.volume = localStorage.getItem('pickSoundVolume') ? Number(localStorage.getItem('pickSoundVolume')) / 100 : DEFAULT_VOLUME / 100;
      }
      audio = _pickSoundAudio;
      break;
  }
  return audio;
}

export function playSound(url: string, track: 'sound' | 'music' | 'pickSound' = 'sound') {
  const audio = getOrLazyInitAudio(track);
  audio.pause();
  audio.src = url;
  audio.play();
}

export function pauseSound(track: 'sound' | 'music' | 'pickSound') {
  const audio = getOrLazyInitAudio(track);
  audio.pause();
}

export function pauseAllSound() {
  if (_soundAudio) _soundAudio.pause();
  if (_musicAudio) _musicAudio.pause();
  if (_pickSoundAudio) _pickSoundAudio.pause();
}

export function playSoundByChampionIdx(championIdx: number) {
  if (championIdx < 0 || championIdx >= championList.length) return;

  const url = championList[championIdx]?.pickSoundURL;
  if (url) playSound(url, 'pickSound');
}