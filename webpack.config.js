const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

// production 빌드에서만 contenthash를 사용한다.
// webpack-dev-server 3 + HMR 조합은 [contenthash]/[chunkhash]를 지원하지 않으므로
// 개발 모드에서는 해시 없는 고정 파일명을 쓴다.
const isProd = process.env.NODE_ENV === 'production';

module.exports = {
    // 빌드 모드: development(빠른 빌드/디버깅) 또는 production(최적화/압축)
    mode: isProd ? 'production' : 'development',

    // 의존성 추적을 시작할 진입점
    entry: './src/index.jsx',

    // 번들 결과물 출력 설정
    output: {
        path: path.resolve(__dirname, 'dist'),   // 절대 경로로 dist 폴더 지정
        filename: isProd ? 'bundle.[contenthash].js' : 'bundle.js', // dev는 해시 없이, prod만 캐싱용 해시
        publicPath: '/',                          // 브라우저가 번들/자원을 찾을 기준 경로
    },

    // import 시 확장자 생략, 경로 별칭 설정
    resolve: {
        extensions: ['.js', '.jsx'],              // import 시 .js/.jsx 확장자 생략 허용
        alias: {
            '@': path.resolve(__dirname, 'src'),    // '@/features/...' 처럼 절대경로 import 가능
        },
    },

    // 파일 종류별로 어떤 로더를 쓸지
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,                   // .js/.jsx 파일은
                exclude: /node_modules/,               // node_modules 제외하고
                use: { loader: 'babel-loader' },       // Babel로 변환
            },
            {
                test: /\.css$/,                        // .css 파일은
                use: ['style-loader', 'css-loader'],   // css-loader로 읽고 style-loader로 주입
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg)$/,     // 이미지 파일은
                use: [
                    {
                        loader: 'url-loader',
                        options: {
                            limit: 8192,                      // 8KB 이하는 data URL로 인라인
                            name: 'assets/[name].[hash].[ext]',
                        },
                    },
                ],
            },
        ],
    },

    // 플러그인: 번들 전체 단위로 동작하는 확장
    plugins: [
        new CleanWebpackPlugin(),                  // 빌드 전 dist 정리
        new HtmlWebpackPlugin({
            template: './public/index.html',         // 이 HTML을 템플릿으로 최종 index.html 생성
        }),
    ],

    // 개발 서버 설정
    devServer: {
        historyApiFallback: true,   // SPA 라우팅: 어떤 경로로 새로고침해도 index.html 반환 (Day 8에서 활용)
        port: 3000,                 // <http://localhost:3000>
        open: true,                 // 실행 시 브라우저 자동 열기
        hot: true,                  // 파일 변경 시 자동 갱신
        proxy: {                    // /api 요청을 json-server(:4000)로 전달 (Day 6부터 사용)
            '/api': {
                target: '<http://localhost:4000>',
                changeOrigin: true,
                pathRewrite: { '^/api': '' },
            },
        },
    },

    devtool: 'source-map',        // 디버깅 시 원본 소스 위치 매핑
};