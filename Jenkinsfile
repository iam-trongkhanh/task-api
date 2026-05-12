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
                        // Dùng dấu ngoặc đơn ''' để dùng biến Bash thay vì Groovy
                        sh '''
                            # Dọn dẹp workspace cũ
                            rm -rf deploy-repo || true

                            # Clone repo Public KHÔNG cần mật khẩu
                            git clone https://github.com/iam-trongkhanh/task-api-deploy.git deploy-repo
                            cd deploy-repo

                            # Dùng sed chuẩn macOS để đè tag mới vào file YAML (tìm mọi tag cũ và thay bằng tag mới)
                            sed -i '' "s|khanh662006q/task-api:.*|khanh662006q/task-api:$IMAGE_TAG|g" api/deployment.yaml

                            # Cấu hình định danh Git
                            git config user.name "Jenkins CI"
                            git config user.email "jenkins@nckh.com"

                            # TIÊM MẬT KHẨU TÀNG HÌNH: Ép Git dùng biến môi trường khi Push
                            git config credential.helper "!f() { echo username=\\$GIT_USERNAME; echo password=\\$GIT_PASSWORD; }; f"

                            # Đóng gói và đẩy lên mây
                            git add api/deployment.yaml
                            git commit -m "Auto-update image tag to build #$IMAGE_TAG"

                            # Push bình thường (Git sẽ tự lôi mật khẩu tàng hình ra xài)
                            git push origin main
                        '''
                    }
                }
           }
        }
    }
