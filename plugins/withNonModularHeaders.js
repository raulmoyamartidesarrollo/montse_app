const { withPodfile } = require('@expo/config-plugins');

module.exports = function withNonModularHeaders(config) {
  return withPodfile(config, (config) => {
    const podfile = config.modResults.contents;

    const marker = '# MONTSEAPP_NON_MODULAR_HEADERS';

    // Evitar aplicar el cambio dos veces
    if (podfile.includes(marker)) {
      return config;
    }

    const search = `    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )`;

    const replacement = `${search}

    ${marker}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end`;

    if (!podfile.includes(search)) {
      throw new Error(
        'No se ha encontrado react_native_post_install en el Podfile generado.'
      );
    }

    config.modResults.contents = podfile.replace(search, replacement);

    return config;
  });
};