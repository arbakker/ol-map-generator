module.exports = {
    publicPath: './',
    module: {
        rules: [
          {
            test: /\.js$/i,
            use: [
              {
                loader: 'raw-loader',
                options: {
                  esModule: false,
                },
              },
            ],
          },
        ],
      },
}