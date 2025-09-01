use global_constants::LOGS_PATH;
use std::fs::OpenOptions;
use std::io::{self, Write};
use std::marker::Send;
use std::path::PathBuf;
use tracing_subscriber::EnvFilter;
use tracing_subscriber::fmt::writer::MakeWriter;

/// MultiWriter writes logs to both stdout and a file, stripping ANSI codes for the file.
pub struct MultiWriter {
    pub log_path: PathBuf,
}

impl<'a> MakeWriter<'a> for MultiWriter {
    type Writer = MultiWriterHandle;

    fn make_writer(&'a self) -> Self::Writer {
        let file = match OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_path)
        {
            Ok(f) => Some(f),
            Err(e) => {
                eprintln!(
                    "Failed to create or open log file {:?}: {}",
                    self.log_path, e
                );
                None
            }
        };
        MultiWriterHandle { file }
    }
}

pub struct MultiWriterHandle {
    file: Option<std::fs::File>,
}

// SAFETY: MultiWriterHandle only contains a File, which is Send + 'static.
unsafe impl Send for MultiWriterHandle {}
unsafe impl Sync for MultiWriterHandle {}

impl Write for MultiWriterHandle {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        // Write original buffer to stdout
        if let Err(e) = io::stdout().write_all(buf) {
            eprintln!("Error writing to stdout: {}", e);
            return Err(e);
        }

        // Write ANSI-stripped text to file
        if let Some(f) = &mut self.file {
            let s = std::str::from_utf8(buf).unwrap_or("");
            let mut parser = ansi_escapers::interpreter::AnsiParser::new(s);
            let text = parser.parse_annotated().text;
            if let Err(e) = f.write_all(text.as_bytes()) {
                eprintln!("Error writing to log file: {}", e);
                return Err(e);
            }
        }

        Ok(buf.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        if let Err(e) = io::stdout().flush() {
            eprintln!("Error flushing stdout: {}", e);
            return Err(e);
        }
        if let Some(f) = &mut self.file {
            if let Err(e) = f.flush() {
                eprintln!("Error flushing log file: {}", e);
                return Err(e);
            }
        }
        Ok(())
    }
}

/// Call this at the start of your main to initialize logging.
pub fn init_logging() {
    // Set warn for all dependencies by default
    let filter = EnvFilter::builder().with_default_directive(tracing::Level::WARN.into());

    // Allow trace for all crates in debug, info in release (use just "trace" or "info" for global)
    #[cfg(debug_assertions)]
    let filter = filter.parse_lossy("trace");

    #[cfg(not(debug_assertions))]
    let filter = filter.parse_lossy("info");

    let log_path = {
        let mut path = PathBuf::from(LOGS_PATH);
        let datetime = chrono::Local::now()
            .format("log%Y-%m-%d_%H-%M-%S.log")
            .to_string();
        path.push(datetime);
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        path
    };

    eprintln!("Logging will attempt to write to: {:?}", log_path);
    let writer = MultiWriter { log_path };

    if let Err(e) = tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_writer(writer)
        .try_init()
    {
        eprintln!("Failed to set tracing subscriber: {}", e);
    }
}
