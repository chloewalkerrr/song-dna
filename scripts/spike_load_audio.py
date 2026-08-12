import librosa
import matplotlib.pyplot as plt

FILE_PATH= "data/audio/JoshWoodward-NQC-11-RiverWentDry.mp3"

waveform, sample_rate = librosa.load(FILE_PATH)

print(f"Type of 'waveform': {type(waveform)}")
print(f"Shape of 'waveform': {waveform.shape}")
print(f"Sample rate: {sample_rate}")
print(f"First 10 values: {waveform[:10]}")

rms_energy = librosa.feature.rms(y=waveform)

print(f"\nType of 'rms_energy': {type(rms_energy)}")
print(f"Shape of 'rms_energy': {rms_energy.shape}")
print(f"First 10 RMS values: {rms_energy[0][:10]}")

# convert frame indices to actual time in seconds (x-axis)
times = librosa.frames_to_time(range(len(rms_energy[0])), sr = sample_rate)

plt.figure(figsize=(12, 4))
plt.plot(times, rms_energy[0])
plt.xlabel("Time (s)")
plt.ylabel("RMS Energy")
plt.title("RMS Energy Over Time - River Went Dry")
plt.tight_layout()
plt.show()