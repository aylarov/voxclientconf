var path = require('path');
var webpack = require('webpack');
var production = process.env.NODE_ENV === 'production';
var plugins = []
	ts_loader = 'react-hot!ts-loader!ts-jsx-loader?harmony=true',
	entry = [];

if (production) {
	ts_loader = 'ts-loader!ts-jsx-loader?harmony=true';

	plugins = plugins.concat([
		new webpack.optimize.UglifyJsPlugin({
	        mangle:   true,
	        compress: {
	            warnings: false, // Suppress uglification warnings
	        },
	    })
	]);

	entry = [
		'./src/app.tsx'
	];

} else {

	entry = [
		'webpack-dev-server/client?http://localhost:8080',
    	'webpack/hot/only-dev-server',
		'./src/app.tsx'		
	];

}

module.exports = {
	entry: entry,
	output: {
		path: path.join(__dirname, 'build'),
		filename: 'bundle.js',
		publicPath: '/build'
	},
	devtool: 'source-map',
	plugins: plugins,
	resolve: {
		extensions: ['', '.ts', '.tsx', '.js']
	},
	module: {
		loaders: [
			{ test: /\.ts(x?)$/, loader: ts_loader },
			{ test: /\.scss$/, loader: 'style-loader!css-loader!sass-loader' },
			{ test: /\.(png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?limit=100000' }
		]
	}
}
