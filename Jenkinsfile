pipeline {
    agent any

    environment {
        // Đã sửa lại đúng username Docker Hub của bạn
        IMAGE_NAME = 'khanh662006q/task-api'
        IMAGE_TAG = "${BUILD_NUMBER}"
        DOCKER_CREDS = 'docker-hub-creds'
        GITHUB_CREDS = 'github-creds'
        // Đã sửa lại đúng URL repo deploy của bạn (dùng HTTPS thay vì SSH)
        DEPLOY_REPO = 'https://github.com/iam-trongkhanh/task-api-deploy.git'
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
                    // Dùng withCredentials để lấy Username và Password ra thành biến môi trường
                    withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDS}", passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
                        sh """
                            # Đăng nhập trực tiếp bằng Bash (an toàn qua stdin)
                            echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin

                            # Push image với tag là Build Number
                            docker push ${IMAGE_NAME}:${IMAGE_TAG}

                            # Đánh tag latest và push
                            docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${IMAGE_NAME}:latest
                            docker push ${IMAGE_NAME}:latest
                        """
                    }
                }
            }
        }

        stage('Update Deployment Repo') {
            steps {
                script {
                    // Đã sửa thành usernamePassword để khớp với khóa PAT trên Jenkins
                    withCredentials([usernamePassword(credentialsId: "${GITHUB_CREDS}", passwordVariable: 'GIT_PASSWORD', usernameVariable: 'GIT_USERNAME')]) {
                        sh """
                            # Xóa thư mục cũ nếu có để tránh lỗi khi clone
                            rm -rf deploy-repo || true

                            # Clone repo bằng HTTPS có kẹp credentials (Username và PAT token)
                            git clone https://${GIT_USERNAME}:${GIT_PASSWORD}@github.com/iam-trongkhanh/task-api-deploy.git deploy-repo
                            cd deploy-repo

                            # Replace REPLACE_IMAGE_TAG bằng sed (dùng trong Linux/macOS)
                            # Cờ '' có thể cần thiết trên macOS sed (sed -i '' "s/...") nhưng chạy trong docker node thì sed chuẩn linux
                            sed -i "s|REPLACE_IMAGE_TAG|${IMAGE_TAG}|g" api/deployment.yaml

                            # Commit và Push
                            git config user.name "Jenkins CI"
                            git config user.email "jenkins@nckh.com"
                            git add api/deployment.yaml
                            git commit -m "Update image tag to ${IMAGE_TAG}"

                            git push https://${GIT_USERNAME}:${GIT_PASSWORD}@github.com/iam-trongkhanh/task-api-deploy.git main
                        """
                    }
                }
            }
        }
    }
}
