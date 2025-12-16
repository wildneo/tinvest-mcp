import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
    input: 'https://russianinvestments.github.io/investAPI/swagger-ui/openapi.yaml',
    output: {
        format: 'prettier',
        lint: 'biome',
        path: './src',
    },
    plugins: [
        {
            name: '@hey-api/client-axios',
            exportFromIndex: true,
            throwOnError: true,
        },
        {
            name: '@hey-api/typescript',
            enums: 'javascript',
        },
        {
            name: '@hey-api/sdk',
        },
        {
            name: 'zod',
            metadata: true,
        },
    ],
});
