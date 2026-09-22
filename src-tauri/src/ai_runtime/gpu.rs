use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuInfo {
    pub device_type: String,
    pub gpu_name: Option<String>,
    pub vram_gb: f32,
    pub cuda_available: bool,
}

pub fn detect_gpu() -> GpuInfo {
    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = std::process::Command::new("nvidia-smi")
            .args([
                "--query-gpu=name,memory.total",
                "--format=csv,noheader,nounits",
            ])
            .output()
        {
            if output.status.success() {
                let text = String::from_utf8_lossy(&output.stdout);
                let parts: Vec<&str> = text.trim().split(',').collect();
                let vram = parts
                    .get(1)
                    .and_then(|s| s.trim().parse::<f32>().ok())
                    .map(|mb| mb / 1024.0)
                    .unwrap_or(8.0);
                return GpuInfo {
                    device_type: "NVIDIA CUDA".into(),
                    gpu_name: parts.first().map(|s| s.trim().to_string()),
                    vram_gb: vram,
                    cuda_available: true,
                };
            }
        }
    }

    GpuInfo {
        device_type: "CPU".into(),
        gpu_name: None,
        vram_gb: 0.0,
        cuda_available: false,
    }
}

pub fn estimate_vram_for_model(model_id: &str) -> f32 {
    match model_id {
        m if m.contains("qwen3:8b") || m.contains("deepseek-r1:8b") => 6.5,
        m if m.contains("mistral:7b") || m.contains("phi4") => 5.0,
        m if m.contains("32b") => 20.0,
        _ => 6.0,
    }
}

pub fn recommend_device(model_id: &str) -> String {
    let gpu = detect_gpu();
    let needed = estimate_vram_for_model(model_id);
    if gpu.cuda_available && gpu.vram_gb >= needed {
        "GPU".into()
    } else {
        "CPU (fallback)".into()
    }
}
