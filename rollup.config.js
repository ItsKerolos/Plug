import babel from 'rollup-plugin-babel';

export default {
  treeshake: false,
  input: 'src/index.js',
  output: {
    file: 'build/extension.js',
    format: 'cjs',
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