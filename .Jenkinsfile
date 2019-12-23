pipeline {
    agent {
        label 'er'
    }
    stages {
        stage('Frontend Tests') {
            agent {
                docker {
                    image 'node:10-alpine'
                    reuseNode true
                }
            }
            environment {
                HOME = '.'
                PARALLEL_TESTS = 2
            }
            options {
                skipDefaultCheckout()
            }
            steps {
                dir('.') {
                    sh(
                        label: 'Setup frontend toolchain',
                        script: 'npm install'
                    )
                    sh(
                        label : 'Run tests',
                        script: 'npm test'
                    )
                }
            }
        }
    }
}
