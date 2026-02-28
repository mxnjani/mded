// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager};

static CLOSE_ALLOWED: AtomicBool = AtomicBool::new(false);

#[derive(serde::Serialize, Clone)]
struct LaunchInfo {
    source: String,
    file_name: Option<String>,
    file_uuid: Option<String>,
    file_path: Option<String>,
}

fn parse_launch_info(args: &[String]) -> LaunchInfo {
    if args.get(1).map(|s| s.as_str()) == Some("mdvault") {
        LaunchInfo {
            source: "mdvault".into(),
            file_name: args.get(2).cloned(),
            file_uuid: args.get(3).cloned(),
            file_path: args.get(4).cloned(),
        }
    } else {
        let file_path = args.get(1)
            .filter(|p| {
                let lower = p.to_lowercase();
                lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".txt")
            })
            .cloned();
        LaunchInfo {
            source: "standalone".into(),
            file_name: None,
            file_uuid: None,
            file_path,
        }
    }
}

#[tauri::command]
fn close_app(window: tauri::Window) {
    CLOSE_ALLOWED.store(true, Ordering::SeqCst);
    let _ = window.close();
}

#[tauri::command]
fn get_launch_info() -> LaunchInfo {
    let args: Vec<String> = std::env::args().collect();
    parse_launch_info(&args)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let launch_info = parse_launch_info(&args);

            if launch_info.file_path.is_some() {
                let _ = app.emit("open-file", launch_info);
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
        .invoke_handler(tauri::generate_handler![close_app, get_launch_info])
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
