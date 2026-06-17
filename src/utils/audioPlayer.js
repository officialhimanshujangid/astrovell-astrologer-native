import { Audio } from 'expo-av';

let currentSound = null;

export const playRingtone = async () => {
  try {
    // If a sound is already playing, stop and unload it first
    if (currentSound) {
      await currentSound.unloadAsync();
      currentSound = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sound.mp3'),
      { shouldPlay: true, isLooping: true }
    );
    currentSound = sound;
  } catch (error) {
    console.warn('Error playing ringtone:', error);
  }
};

export const stopRingtone = async () => {
  try {
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    }
  } catch (error) {
    console.warn('Error stopping ringtone:', error);
  }
};
