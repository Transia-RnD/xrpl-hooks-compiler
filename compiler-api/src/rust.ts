import { mkdirSync, writeFileSync, existsSync, openSync, closeSync, readFileSync, renameSync, rmSync, unlinkSync } from "fs";
import { deflateSync } from "zlib";
import { execSync } from "child_process";
import { z } from 'zod';

// Rust compilation paths
// const tempDir = "/tmp";
// const rustToolchainPath = process.env.RUST_TOOLCHAIN_PATH || "/usr/local/rust";

export interface ResponseData {
  success: boolean;
  message: string;
  output: string;
  tasks: Task[];
}

export interface Task {
  name: string;
  file?: string;
  success?: boolean;
  console?: string;
  output?: string;
}

export const requestBodySchema = z.object({
  output: z.enum(['wasm']),
  files: z.array(z.object({
    type: z.literal('rust'),
    name: z.string(),
    src: z.string()
  })),
  target: z.enum(['wasm32-unknown-unknown', 'wasm32v1-none']).optional().default('wasm32v1-none'),
  profile: z.enum(['dev', 'release']).optional().default('release'),
  features: z.array(z.string()).optional().default([]),
  compress: z.boolean().optional(),
  optimize: z.boolean().optional().default(true)
});

export type RequestBody = z.infer<typeof requestBodySchema>;

function sanitize_shell_output<T>(out: T): T {
  return out; 
}

function execute_command(cmd: string, cwd: string): string {
  const logFile = cwd + '/build.log';
  const out = openSync(logFile, 'w');
  let error = '';
  
  try {
    execSync(cmd, { cwd, stdio: [null, out, out] });
  } catch (ex: unknown) {
    if (ex instanceof Error) {
      error = ex.message;
    }
  } finally {
    console.log(out);
    
    closeSync(out);
  }
  
  const result = readFileSync(logFile).toString() || error;
  return result;
}

function create_cargo_manifest(projectDir: string, features: string[], target: string): void {
  const cargoContent = `
[package]
name = "base"
version = "0.1.0"
edition = "2024"
description = ""
license = "MIT"

[workspace]

[lib]
crate-type = ["cdylib"]

[profile.release]
opt-level = "z"         # Most aggressive size optimization
lto = true
codegen-units = 1
panic = "abort"
strip = true            # Remove debug symbols
debug = false           # Disable debug info generation
overflow-checks = false # Disable overflow checks (use cautiously)

[profile.dev]
panic = "unwind"

[dependencies]
xrpl-wasm-std = { git = "https://github.com/Transia-RnD/craft.git", branch = "dangell/smart-contracts", package = "xrpl-wasm-std" }
`.trim();

  writeFileSync(`${projectDir}/Cargo.toml`, cargoContent);
}

function validate_rust_filename(name: string): boolean {
  if (!/^[A-Za-z0-9_-]+\.rs$/.test(name)) {
    return false;
  }
  
  const parts = name.split('/');
  for (const part of parts) {
    if (part === '.' || part === '..') {
      return false;
    }
  }
  return true;
}

function compile_rust_project(
  sourceFiles: string[], 
  projectDir: string, 
  target: string,
  profile: string,
  outputFile: string, 
  taskResult: Task
): boolean {
  const profileFlag = profile === 'release' ? '--release' : '';
  const cmd = `cargo build --target ${target} ${profileFlag}`;
  
  const output = execute_command(cmd, projectDir);
  taskResult.console = sanitize_shell_output(output);
  
  // Find the generated WASM file
  const wasmPath = `${projectDir}/target/${target}/${profile}/base.wasm`;
  
  if (!existsSync(wasmPath)) {
    console.log('WASM output not found at expected location:', wasmPath);
    taskResult.success = false;
    return false;
  }
  
  // Copy to expected output location
  renameSync(wasmPath, outputFile);
  taskResult.success = true;
  return true;
}

function serialize_binary_data(filename: string, compress: boolean): string {
  let content = readFileSync(filename);
  if (compress) {
    content = deflateSync(content);
  }
  return content.toString("base64");
}

export function build_project(request: RequestBody, baseName: string): ResponseData {
  const { output, files, target, profile, features, compress, optimize } = request;
  
  let buildResult: ResponseData = {
    success: false,
    message: '',
    output: '',
    tasks: [],
  };
  
  const projectDir = baseName + '.project';
  const wasmOutput = baseName + '.wasm';
  
  const cleanup = (success: boolean, message: string) => {
    if (existsSync(projectDir)) {
      rmSync(projectDir, { recursive: true });
    }
    if (existsSync(wasmOutput)) {
      unlinkSync(wasmOutput);
    }
    
    buildResult.success = success;
    buildResult.message = message;
    return buildResult;
  };
  
  if (output !== 'wasm') {
    return cleanup(false, 'Invalid output type: ' + output);
  }
  
  if (!files.length) {
    return cleanup(false, 'No source files provided');
  }
  
  // Create project structure
  if (!existsSync(projectDir)) {
    mkdirSync(projectDir);
    mkdirSync(`${projectDir}/src`);
  }
  
  // Generate Cargo.toml
  console.log(projectDir);

  create_cargo_manifest(projectDir, features || [], target || 'wasm32v1-none');
  // Write source files
  const sourceFiles: string[] = [];
  for (const file of files) {
    if (!validate_rust_filename(file.name)) {
      console.error('Invalid filename:', file.name);
      return cleanup(false, 'Invalid filename: ' + file.name);
    }
    
    const filepath = `${projectDir}/src/${file.name}`;
    sourceFiles.push(filepath);
    
    if (!file.src) {
      console.error('Empty source for file:', file.name);
      return cleanup(false, 'Source file ' + file.name + ' is empty');
    }
    
    writeFileSync(filepath, file.src);
  }
  
  // Ensure we have a lib.rs if not provided
  if (!files.find(f => f.name === 'lib.rs')) {
    console.error('Missing lib.rs file');
    return cleanup(false, 'Missing lib.rs file');
  }
  
  // Compile Rust to WASM
  const compileTask = { name: 'compiling rust to wasm' };
  buildResult.tasks.push(compileTask);
  
  if (!compile_rust_project(sourceFiles, projectDir, target || 'wasm32v1-none', profile || 'release', wasmOutput, compileTask)) {
    return cleanup(false, 'Compilation failed');
  }

  console.log('WASM output generated at:', wasmOutput);
  
  
  // Serialize final output
  buildResult.output = serialize_binary_data(wasmOutput, compress || false);
  
  return cleanup(true, 'Compilation successful');
}