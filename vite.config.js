import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// 개발 서버(npm run dev)에서도 /api/*.js 를 실행해 주는 플러그인.
// vercel dev 없이 화면 + 서버 함수를 함께 확인할 수 있습니다. (배포 때는 Vercel 이 api/ 를 실행하므로 쓰이지 않음)
function localApi(env) {
  return {
    name: 'local-api',
    configureServer(server) {
      Object.assign(process.env, env) // .env.local 의 비밀 키를 서버 함수가 읽을 수 있게
      server.middlewares.use(async (req, res, next) => {
        const m = req.url.match(/^\/api\/([\w-]+)/)
        if (!m) return next()
        const send = (code, body) => {
          res.statusCode = code
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(body))
        }
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.js`)
          req.query = Object.fromEntries(new URL(req.url, 'http://localhost').searchParams)
          if (req.method === 'POST') {
            let raw = ''
            for await (const chunk of req) raw += chunk
            req.body = raw ? JSON.parse(raw) : {}
          }
          res.status = (code) => { res.statusCode = code; return res }
          res.json = (body) => send(res.statusCode || 200, body)
          await mod.default(req, res)
        } catch (e) {
          send(500, { error: e.message })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), localApi(loadEnv(mode, process.cwd(), ''))],
}))
