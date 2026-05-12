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
                    withCredentials([usernamePassword(credentialsId: "${GITHUB_CREDS}", passwordVariable: 'GIT_PASSWORD', usernameVariable: 'GIT_USERNAME')]) {
                        // Dùng ngoặc kép """ để Jenkins và VS Code dễ hiểu
                        sh """
                            # 1. Dọn dẹp rác cũ
                            rm -rf deploy-repo || true

                            # 2. Clone kèm theo Auth (Dùng \\$ để ép Bash tự điền Username và Token, giấu nhẹm khỏi Jenkins log)
                            git clone https://\$GIT_USERNAME:\$GIT_PASSWORD@github.com/iam-trongkhanh/task-api-deploy.git deploy-repo
                            cd deploy-repo

                            # 3. Sửa tag bằng sed của Mac (Dùng \${IMAGE_TAG} để Jenkins chủ động điền số Build vào)
                            sed -i '' "s|khanh662006q/task-api:.*|khanh662006q/task-api:${IMAGE_TAG}|g" api/deployment.yaml

                            # 4. Định danh người commit
                            git config user.name "Jenkins CI"
                            git config user.email "jenkins@nckh.com"

                            # 5. Đóng gói và Commit
                            git add api/deployment.yaml
                            git commit -m "Auto-update image tag to build #${IMAGE_TAG}" || echo "Không có thay đổi mới nào."

                            # 6. Push thẳng lên mây (Vì lúc clone đã chèn mật khẩu vào link rồi nên Git sẽ không thắc mắc nữa)
                            git push origin main
                        """
                    }
                }
            }
        }
    }
}
