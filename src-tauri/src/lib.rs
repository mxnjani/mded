// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager};

static CLOSE_ALLOWED: AtomicBool = AtomicBool::new(false);

fn get_launch_file_from_args(args: &[String]) -> Option<String> {
    args.get(1)
        .filter(|p| {
            let lower = p.to_lowercase();
            lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".txt")
        })
        .cloned()
}

#[tauri::command]
fn close_app(window: tauri::Window) {
    CLOSE_ALLOWED.store(true, Ordering::SeqCst);
    let _ = window.close();
}

#[tauri::command]
fn get_launch_file() -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    get_launch_file_from_args(&args)
}

#[tauri::command]
fn show_maximized_native(window: tauri::Window) {
    let _ = window.show();
    let _ = window.maximize();
    let _ = window.set_focus();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let file_path = get_launch_file_from_args(&args);

            if let Some(path) = file_path {
                let _ = app.emit("open-file", path);
            }

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            close_app,
            get_launch_file,
            show_maximized_native
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if CLOSE_ALLOWED.load(Ordering::SeqCst) {
                    return;
                }
                api.prevent_close();
                let _ = window.emit("close-requested", ());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
