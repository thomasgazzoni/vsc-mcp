# Dockerfile
FROM gitpod/openvscode-server:latest

ENV OPENVSCODE_SERVER_ROOT=/home/.openvscode-server
ENV OVS=${OPENVSCODE_SERVER_ROOT}/bin/openvscode-server

# ports
EXPOSE 3000
EXPOSE 5007

# Install Rust toolchain, needed for rust-analyzer
USER root
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        build-essential          \
        gcc                      \
        clang                    \
        lld                      \
 && rm -rf /var/lib/apt/lists/*
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# 1. copy your own extension
COPY extension/vsc-mcp-extension-0.1.0.vsix /tmp/vsc-mcp.vsix

# 2. grab the other VSIX files
RUN wget -q -O /tmp/rust.vsix \
      https://github.com/rust-lang/rust-analyzer/releases/download/2025-04-28/rust-analyzer-linux-arm64.vsix \
 && wget -q -O /tmp/vim.vsix \
      https://github.com/VSCodeVim/Vim/releases/download/v1.24.3/vim-1.24.3.vsix

# 3. install everything
RUN echo "Installing extensions…" \
 && ${OVS} --install-extension /tmp/vsc-mcp.vsix \
 && ${OVS} --install-extension /tmp/rust.vsix \
 && ${OVS} --install-extension /tmp/vim.vsix  \
 && ${OVS} --install-extension gitpod.gitpod-theme \
 && echo "✅  All extensions installed"

# 4. stash a copy so we can seed an empty volume at run-time
RUN cp -r /home/.openvscode-server/extensions /tmp/installed-extensions