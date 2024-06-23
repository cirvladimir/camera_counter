import cv2
import numpy as np
import scipy
import math

def eval_fft(y):
  y = np.abs(y)
  best_ind = np.argmax(y[3:len(y) // 2]) + 3
  return min(y[best_ind] - y[best_ind - 1], y[best_ind] - y[best_ind + 1])

def get_best_crop(column):
  best_num = None
  best_i = None
  for i in range(5):
    y = scipy.fft.fft(column[0:len(column)-i])
    num = eval_fft(y)
    if best_num is None or num > best_num:
      best_num = num
      best_i = i
  return column[0:len(column)-best_i]

def get_freq(col):
  y = scipy.fft.fft(col)
  best_ind = np.argmax(np.abs(y)[5:len(col) // 2]) + 5
  return best_ind, y[best_ind]

def get_shift(freq, period):
  ang_shift = -np.angle(freq)
  if ang_shift < 0:
    ang_shift += 2 * math.pi
  return period * ang_shift / (2 * math.pi)


def count_points(gray):
  column = np.mean(gray, axis=1)
  column = get_best_crop(column)
  fft_ind, freq = get_freq(column)
  period = len(column) / fft_ind
  shift = get_shift(freq, period)

  row = float(shift)
  pts = []
  while row < len(column):
    pts.append(row)
    row += float(period)

  return pts

def count_sheets(img, rectangle):
  if rectangle['width'] > 10:
    rectangle['x'] = rectangle['x'] + rectangle['width'] // 2 - 5
    rectangle['width'] = 10
  img_part = img[rectangle['y']:rectangle['y'] + rectangle['height'], rectangle['x']:rectangle['x'] + rectangle['width']]
  # Convert to grayscale
  gray = cv2.cvtColor(img_part, cv2.COLOR_BGR2GRAY)

  points = count_points(gray)

  if (len(points) < 30):
    return points

  
  num_chunks = len(points) // 5
  col_len = gray.shape[0]
  avg_period = col_len / len(points)
  points = []
  for chunk in range(num_chunks):
    chunk_len = col_len / (num_chunks + 1)
    pix_min_range = max(0, int(chunk * chunk_len))
    pix_max_range = min(col_len, int((chunk + 2) * chunk_len))
    cur_col_chunk = gray[pix_min_range:pix_max_range,:]

    points += [pt + pix_min_range for pt in count_points(cur_col_chunk)]
  
  points = sorted(points)
  print(points)
  summed_pts = []
  last_points = []
  for pt in points:
    if len(last_points) == 0 or pt - last_points[-1] < (avg_period * 0.5):
      last_points.append(pt)
    else:
      summed_pts.append(np.mean(last_points))
      last_points = [pt]
  summed_pts.append(np.mean(last_points))

  return summed_pts



if __name__ == '__main__':
  img = cv2.imread('steel-sheet.jpg')
  print(count_sheets(img, {'x': 276, 'y': 13, 'width': 17, 'height': 278}))