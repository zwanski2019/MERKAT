// MERKAT desktop shell (Tauri v2). Hardware plugins (ESC/POS printer, cash
// drawer, barcode scanner) land in Phase 4 — see CLAUDE.md §7.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running MERKAT desktop");
}
