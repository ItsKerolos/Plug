import babel from 'rollup-plugin-babel';

export default {
  treeshake: true,
  input: 'src/index.js',
  output: {
    file: 'build/extension.js',
    format: 'esm',
    name: 'bundle'
  },
  plugins: [
    babel({
      'comments': false,
      'presets': [
        [
          '@babel/preset-env',
          {
            'targets': {
              'esmodules': true
            }
          }
        ]
      ]
    })
  ]
};