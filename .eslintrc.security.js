module.exports = {
  extends: [
    '@react-native',
    'plugin:security/recommended'
  ],
  plugins: [
    'security',
    'no-secrets'
  ],
  rules: {
    // Security-specific rules
    'security/detect-buffer-noinit': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-new-buffer': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-object-injection': 'warn',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    
    // No-secrets plugin
    'no-secrets/no-secrets': [
      'error',
      {
        tolerance: 4.5,
        ignoreIdentifiers: [
          'API_KEY',
          'SECRET_KEY',
          'ACCESS_TOKEN',
          'REFRESH_TOKEN',
          'PASSWORD',
          'DATABASE_URL'
        ],
        ignorePatterns: [
          'test',
          'mock',
          'example',
          'sample',
          'placeholder'
        ]
      }
    ],
    
    // React Native specific security rules
    'react-native/no-inline-styles': 'warn',
    'react-native/no-raw-text': 'warn',
    
    // Custom security rules
    'no-hardcoded-credentials': {
      create: function(context) {
        return {
          Literal: function(node) {
            const value = node.value;
            if (typeof value === 'string') {
              const lowerValue = value.toLowerCase();
              
              // Check for common credential patterns
              const credentialPatterns = [
                /password\s*[:=]\s*['"][^'"]+['"]/i,
                /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
                /secret\s*[:=]\s*['"][^'"]+['"]/i,
                /token\s*[:=]\s*['"][^'"]+['"]/i
              ];
              
              if (credentialPatterns.some(pattern => pattern.test(lowerValue))) {
                context.report({
                  node,
                  message: 'Hardcoded credentials detected. Use environment variables or secure storage instead.'
                });
              }
            }
          }
        };
      }
    }
  },
  overrides: [
    {
      files: ['*.test.*', '*.spec.*', '**/__tests__/**'],
      rules: {
        'security/detect-non-literal-fs-filename': 'off',
        'security/detect-non-literal-require': 'off',
        'no-secrets/no-secrets': 'off'
      }
    },
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-module-boundary-types': 'warn'
      }
    }
  ],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx']
      }
    }
  }
};