use configman::ConfigMan;

fn main() {
    logging::init_logging();
    let conf = ConfigMan::load_or_init_config("config.json");
}
