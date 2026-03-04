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
fn show_maximized_native(window: tauri::Window, is_dark_mode: bool) {
    if is_dark_mode {
        let _ = window.set_background_color(Some(tauri::utils::config::Color(10, 10, 10, 255)));
        let _ = window.set_theme(Some(tauri::Theme::Dark));
    } else {
        let _ = window.set_background_color(Some(tauri::utils::config::Color(255, 255, 255, 255)));
        let _ = window.set_theme(Some(tauri::Theme::Light));
    }
    let _ = window.show();
    let _ = window.maximize();
    let _ = window.set_focus();
}

#[tauri::command]
fn set_native_theme(window: tauri::Window, is_dark_mode: bool) {
    if is_dark_mode {
        let _ = window.set_background_color(Some(tauri::utils::config::Color(10, 10, 10, 255)));
        let _ = window.set_theme(Some(tauri::Theme::Dark));
    } else {
        let _ = window.set_background_color(Some(tauri::utils::config::Color(255, 255, 255, 255)));
        let _ = window.set_theme(Some(tauri::Theme::Light));
    }
}

#[tauri::command]
async fn fetch_link_title(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    match client.get(&url).send().await {
        Ok(resp) => {
            let text = resp.text().await.map_err(|e| e.to_string())?;
            let text_lower = text.to_lowercase();
            if let Some(start) = text_lower.find("<title>") {
                let after_open = start + 7;
                if let Some(end_offset) = text_lower[after_open..].find("</title>") {
                    let title = &text[after_open..after_open + end_offset];
                    let decoded = title
                        .replace("&amp;", "&")
                        .replace("&lt;", "<")
                        .replace("&gt;", ">")
                        .replace("&quot;", "\"")
                        .replace("&#39;", "'")
                        .replace("&#x27;", "'");
                    return Ok(decoded.trim().to_string());
                }
            }
            Err("Title not found on the page".to_string())
        }
        Err(e) => Err(format!("Request failed: {}", e)),
    }
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
            show_maximized_native,
            set_native_theme,
            fetch_link_title
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
