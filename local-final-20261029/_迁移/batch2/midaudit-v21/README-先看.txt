中层审计包（2026-10-23）
1. 先读 00-INSTRUCTION.txt，再读 30-中层审计材料.md（审计范围、17 项声称、8 个问题、输出格式）。
2. 复现：cd bz-oracle && bash scripts/selftest.sh（需 Node ≥ 18，可离线运行；最后一行应为"全部通过"）。
3. r21/ 是契约与语义的依据（M1–M4、R21 送评材料、R21 回执）；selftest 会读取 ../r21。
4. MANIFEST.sha256 是全部文件的校验和，可用 sha256sum -c MANIFEST.sha256 核对。
