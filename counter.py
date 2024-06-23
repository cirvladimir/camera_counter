import cv2
import numpy as np
import scipy
import math

def get_freq(col):
  y = scipy.fft.fft(col)
  best_ind = np.argmax(np.abs(y)[3:len(col) // 2]) + 3
  return best_ind, y[best_ind]

def get_shift(freq, period):
  ang_shift = -np.angle(freq)
  if ang_shift < 0:
    ang_shift += 2 * math.pi
  return period * ang_shift / (2 * math.pi)


def count_sheets(img, rectangle):
  if rectangle['width'] > 10:
    rectangle['x'] = rectangle['x'] + rectangle['width'] // 2 - 5
    rectangle['width'] = 10
  img_part = img[rectangle['y']:rectangle['y'] + rectangle['height'], rectangle['x']:rectangle['x'] + rectangle['width']]
  # Convert to grayscale
  gray = cv2.cvtColor(img_part, cv2.COLOR_BGR2GRAY)

  column = np.mean(gray, axis=1)
  fft_ind, freq = get_freq(column)
  period = len(column) / fft_ind
  shift = get_shift(freq, period)

  return float(shift), float(period)

if __name__ == '__main__':
  img = cv2.imread('steel-sheet.jpg')
  print(count_sheets(img, {'x': 276, 'y': 13, 'width': 17, 'height': 278}))