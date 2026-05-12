pipeline {
    agent any

    environment {
        IMAGE_NAME = 'dockerhub_user/task-api'
        IMAGE_TAG = "${BUILD_NUMBER}"
        DOCKER_CREDS = 'docker-hub-creds'
        GITHUB_CREDS = 'github-creds'
        DEPLOY_REPO = 'git@github.com:yourusername/task-api-deploy.git' // Adjust as needed
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm install'
            }
        }

        stage('Run App & Test') {
            steps {
                script {
                    // Spin up temporary Postgres DB for tests
                    sh 'docker run -d --name test-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=taskdb -p 5432:5432 postgres:15-alpine'
                    
                    // Wait for DB to be ready
                    sh 'sleep 10'

                    // Start the app with local DB connection in background
                    sh 'DB_HOST=localhost nohup npm start > app.log 2>&1 &'
                    
                    // Wait for the app and DB initialization to complete
                    sh 'sleep 10'

                    try {
                        // Run Newman tests
                        sh 'npx newman run tests/TaskManagement.postman_collection.json -e tests/dev.postman_environment.json'
                    } finally {
                        // Cleanup
                        sh 'kill $(lsof -t -i:3000) || true'
                        sh 'docker stop test-db && docker rm test-db || true'
                        sh 'cat app.log || true'
                    }
                }
            }
        }

        stage('Build Image') {
            steps {
                script {
                    docker.build("${IMAGE_NAME}:${IMAGE_TAG}")
                }
            }
        }

        stage('Push Image') {
            steps {
                script {
                    docker.withRegistry('https://index.docker.io/v1/', "${DOCKER_CREDS}") {
                        docker.image("${IMAGE_NAME}:${IMAGE_TAG}").push()
                        // Optional: push latest tag as well
                        docker.image("${IMAGE_NAME}:${IMAGE_TAG}").push('latest')
                    }
                }
            }
        }

        stage('Update Deployment Repo') {
            steps {
                script {
                    // Clone deploy repo
                    withCredentials([sshUserPrivateKey(credentialsId: "${GITHUB_CREDS}", keyFileVariable: 'SSH_KEY')]) {
                        sh '''
                            export GIT_SSH_COMMAND="ssh -i $SSH_KEY -o StrictHostKeyChecking=no"
                            git clone ${DEPLOY_REPO} deploy-repo
                            cd deploy-repo
                            
                            # Replace REPLACE_IMAGE_TAG with the actual build number using sed
                            sed -i "s/REPLACE_IMAGE_TAG/${IMAGE_TAG}/g" api/deployment.yaml
                            
                            git config user.name "Jenkins CI"
                            git config user.email "jenkins@example.com"
                            git add api/deployment.yaml
                            git commit -m "Update image tag to ${IMAGE_TAG}"
                            git push origin main
                        '''
                    }
                }
            }
        }
    }
}
