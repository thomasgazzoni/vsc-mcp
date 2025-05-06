# Dockerfile
FROM gitpod/openvscode-server:latest

ENV OPENVSCODE_SERVER_ROOT=/home/.openvscode-server
ENV OVS=${OPENVSCODE_SERVER_ROOT}/bin/openvscode-server

# ports
EXPOSE 3000
EXPOSE 5007

#### install vs-code extensions OS dependencies/envs

# Rust toolchain, needed for rust-analyzer
USER root
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        build-essential          \
        gcc                      \
        clang                    \
        lld                      \
 && rm -rf /var/lib/apt/lists/*
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

# .NET SDK, needed for C# extension
RUN wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
 && dpkg -i packages-microsoft-prod.deb \
 && rm packages-microsoft-prod.deb \
 && apt-get update \
 && apt-get install -y apt-transport-https \
 && apt-get update \
 && apt-get install -y dotnet-sdk-8.0 \
 && rm -rf /var/lib/apt/lists/*

#### pre-install vs-code extensions (from different sources)

# 1. from local file
COPY extension/vsc-mcp-extension-0.1.0.vsix /tmp/vsc-mcp.vsix

# 2. from VSIX file on web (good for installed a fixed version)
RUN wget -q -O /tmp/rust.vsix \
      https://github.com/rust-lang/rust-analyzer/releases/download/2025-04-28/rust-analyzer-linux-arm64.vsix \
 && wget -q -O /tmp/vim.vsix \
      https://github.com/VSCodeVim/Vim/releases/download/v1.24.3/vim-1.24.3.vsix

# 3. Install a newer Node.js version for building the C# extension
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y nodejs \
 && node --version \
 && npm --version

# # 4. Clone and build the C# extension from source
# RUN apt-get update \
#  && apt-get install -y git \
#  && git clone --depth 1 --branch v2.72.34 https://github.com/dotnet/vscode-csharp.git /tmp/vscode-csharp \
#  && cd /tmp/vscode-csharp \
#  && npm install \
#  && npm run compile \
#  && npm run package \
#  && npx vsce package \
#  && cp /tmp/vscode-csharp/csharp-42.42.42-placeholder.vsix /tmp/csharp.vsix

# 4. install all the above extensions
RUN echo "Installing extensions…" \
 && ${OVS} --install-extension /tmp/vsc-mcp.vsix \
 && ${OVS} --install-extension /tmp/rust.vsix \
 && ${OVS} --install-extension /tmp/vim.vsix \
#  && ${OVS} --install-extension /tmp/csharp.vsix \
 # we can also install extension using vs-code marketplace directly
 && ${OVS} --install-extension gitpod.gitpod-theme \
 && ${OVS} --install-extension ms-dotnettools.vscode-dotnet-runtime \
 && ${OVS} --install-extension muhammad-sammy.csharp \
 && echo "✅  All extensions installed"

# 5. stash a copy so we can seed an empty volume at run-time
RUN cp -r /home/.openvscode-server/extensions /tmp/installed-extensions