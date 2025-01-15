#! /bin/zsh

function render_size
{
  if [ "${3}" = "" ]; then
    size_label=$1
  else
    size_label=$3
  fi
  if [[ "$2" =~ ".*Dark.*" ]]; then
    # qlmanage doesn't support transparent background
    # This requires ImageMagick to be installed and in the path.
    magick -background none -size $1x$1 "$2" "${2}.png"
  else
    qlmanage -t -s $1 -o . "$2"
  fi
  mv "${2}.png" "${2%.svg}-${size_label}.png"
}
render_size 20 $1
render_size 29 $1
render_size 40 $1
render_size 40 $1 "20@2x"
render_size 58 $1 "29@2x"
render_size 60 $1 "20@3x"
render_size 76 $1 "38@2x"
render_size 114 $1 "38@3x"
render_size 80 $1 "40@2x"
render_size 87 $1 "29@3x"
render_size 120 $1 "40@3x"
render_size 120 $1 "60@2x"
render_size 128 $1 "64@2x"
render_size 192 $1 "64@3x"
render_size 136 $1 "68@2x"
render_size 152 $1 "76@2x"
render_size 167 $1 "83.5@2x"
render_size 180 $1 "60@3x"
render_size 1024 $1
