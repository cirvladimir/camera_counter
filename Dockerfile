# syntax=docker/dockerfile:1

FROM ubuntu:22.04

SHELL ["/bin/bash", "-c"]

RUN <<EOF
set -e
apt-get update

# Maybe we need to remove the --no-install-recommends flag
apt-get install -y --no-install-recommends python3 python3-pip git libgl1 libglib2.0-0 openssh-client

pip3 install numpy opencv-python flask

rm -rf /var/lib/apt/lists/*
EOF