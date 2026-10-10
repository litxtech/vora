import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Tarayıcı varsayılan beyaz zemini ve kenar boşluğunu kapatır.
 * Uygulama pencerenin tamamını doldurur.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                height: 100%;
                margin: 0;
                padding: 0;
                background: #0A0E14;
              }
              body {
                overflow: hidden;
                min-height: 100vh;
                min-height: 100dvh;
              }
              #root {
                display: flex;
                flex: 1;
                min-height: 100%;
                width: 100%;
              }
              #root [role="button"], #root a, #root button { cursor: pointer; }
              #root input, #root textarea { font-size: 16px; }
              @media (min-width: 840px) {
                body {
                  display: flex;
                  justify-content: center;
                  background: #05070b;
                }
                #root {
                  width: 420px;
                  max-width: 420px;
                  flex: none;
                  height: 100dvh;
                  min-height: 100dvh;
                  box-shadow: 0 0 0 1px rgba(255,255,255,0.08);
                }
              }
            `,
          }}
        />
      </head>
      <body>
        {children}
        <script src="/offline-boot.js" defer />
      </body>
    </html>
  );
}
