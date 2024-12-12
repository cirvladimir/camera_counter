# syntax=docker/dockerfile:1

FROM ubuntu:22.04 AS dev

SHELL ["/bin/bash", "-c"]

RUN <<EOF
set -e
apt-get update

# Maybe we need to remove the --no-install-recommends flag
apt-get install -y --no-install-recommends python3 python3-pip git libgl1 libglib2.0-0 openssh-client

pip3 install numpy opencv-python flask scipy

rm -rf /var/lib/apt/lists/*
EOF

RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && echo "$SNIPPET" >> "/root/.bashrc"

RUN sed -i 's/#force_color_prompt=yes/force_color_prompt=yes/' /root/.bashrc

FROM dev

WORKDIR /app

COPY . .