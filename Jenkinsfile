node {
    env.NODEJS_HOME = "${tool 'Node 12.x'}"
    // on linux / mac
    env.PATH="${env.NODEJS_HOME}/bin:${env.PATH}"
    // on windows
    // env.PATH="${env.NODEJS_HOME};${env.PATH}"
    try {
      sh 'npm --version'
    } catch (ex) {
      throw ex
    }
}
pipeline {
  agent any
  // options {
  //   gitLabConnection('gitlab')
  // }
  // environment {
  //   CF = credentials('pws-credentials')
  // }
  stages {
    stage('npm install') {
      steps {
        // updateGitlabCommitStatus name: 'build', state: 'running'
        script {
          try {
            sh 'npm install'
            // updateGitlabCommitStatus name: 'build', state: 'success'
          } catch (ex) {
            // updateGitlabCommitStatus name: 'build', state: 'failed'
            throw ex
          }
        }
      }
    }
    // stage('build') {
    //   steps {
    //     script {
    //       // updateGitlabCommitStatus name: 'build', state: 'running'
    //       try {
    //         sh 'npm run build'
    //         // updateGitlabCommitStatus name: 'build', state: 'success'
    //       } catch (ex) {
    //         // updateGitlabCommitStatus name: 'build', state: 'failed'
    //         throw ex
    //       }
    //     }
    //   }
    // }
    // stage('test') {
    //   steps {
    //     script {
    //       // updateGitlabCommitStatus name: 'test', state: 'running'
    //       try {
    //         sh 'npm run test'
    //         // updateGitlabCommitStatus name: 'test', state: 'success'
    //       } catch (ex) {
    //         // updateGitlabCommitStatus name: 'test', state: 'failed'
    //         throw ex
    //       }
    //     }
    //   }
    // }
    stage('deploy') {
      steps {
        script {
          // updateGitlabCommitStatus name: 'deploy-master', state: 'running'
          try {
            // updateGitlabCommitStatus name: 'deploy-master', state: 'running'
            sh 'rsync -avh ./ /home/ubuntu/applications/chat-server --delete'
          } catch (ex) {
            // updateGitlabCommitStatus name: 'deploy-master', state: 'failed'
            throw ex
            error('')
          }
          // updateGitlabCommitStatus name: 'deploy-master', state: 'success'
        }
      }
    }
  }
  // post {
  //   always {
  //     deleteDir()
  //   }
  //   success {
  //     updateGitlabCommitStatus state: 'success'
  //   }
  //   failure {
  //     updateGitlabCommitStatus state: 'failed'
  //   }
  // }
}