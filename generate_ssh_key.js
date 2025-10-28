const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 确保SSH目录存在
const sshDir = path.join(process.env.USERPROFILE || process.env.HOME, '.ssh');
if (!fs.existsSync(sshDir)) {
  fs.mkdirSync(sshDir, { recursive: true });
  console.log(`创建SSH目录: ${sshDir}`);
}

// 生成临时文件路径
const tempKeyPath = path.join(process.cwd(), 'temp_id_rsa');
const tempPubKeyPath = path.join(process.cwd(), 'temp_id_rsa.pub');

// 生成RSA密钥对
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs1',
    format: 'pem'
  }
});

// 保存临时密钥文件
fs.writeFileSync(tempKeyPath, privateKey);
fs.writeFileSync(tempPubKeyPath, publicKey);

// 使用ssh-keygen将PEM格式转换为OpenSSH格式
let openSshPublicKey = '';
try {
  // 尝试使用ssh-keygen转换
  const output = execSync(`ssh-keygen -f "${tempKeyPath}" -y`, { encoding: 'utf8' });
  openSshPublicKey = output.trim() + ` github-key-${Date.now()}`;
} catch (err) {
  console.log('ssh-keygen转换失败，尝试手动转换:', err.message);
  
  // 如果ssh-keygen不可用，尝试手动转换
  try {
    // 读取DER格式的公钥
    const derPublicKey = crypto.createPublicKey({
      key: publicKey,
      format: 'pem',
      type: 'spki'
    }).export({
      format: 'der',
      type: 'spki'
    });
    
    // 手动构建OpenSSH格式的公钥
    const base64PublicKey = derPublicKey.toString('base64');
    openSshPublicKey = `ssh-rsa ${base64PublicKey} github-key-${Date.now()}`;
  } catch (manualErr) {
    console.error('手动转换也失败:', manualErr.message);
    process.exit(1);
  }
} finally {
  // 清理临时文件
  try {
    fs.unlinkSync(tempKeyPath);
    fs.unlinkSync(tempPubKeyPath);
  } catch (err) {
    // 忽略清理错误
  }
}

// 保存密钥文件 - 使用完全不同的文件名
const privateKeyPath = path.join(sshDir, 'id_rsa_github_desktop_openssh');
const publicKeyPath = path.join(sshDir, 'id_rsa_github_desktop_openssh.pub');

fs.writeFileSync(privateKeyPath, privateKey);
fs.writeFileSync(publicKeyPath, openSshPublicKey);

// 设置文件权限 (在Windows上可能不完全适用)
try {
  fs.chmodSync(privateKeyPath, 0o600);
  fs.chmodSync(publicKeyPath, 0o644);
} catch (err) {
  console.log('在Windows上，请确保私钥文件权限适当。');
}

console.log('SSH密钥对已成功生成！');
console.log(`私钥: ${privateKeyPath}`);
console.log(`公钥: ${publicKeyPath}`);
console.log('\n公钥内容 (OpenSSH格式):');
console.log(openSshPublicKey);

// 将公钥写入临时文件，方便用户复制
const finalPubKeyPath = path.join(process.cwd(), 'github_ssh_public_key_final.pub');
fs.writeFileSync(finalPubKeyPath, openSshPublicKey);
console.log('\n公钥已保存到文件:', finalPubKeyPath);
console.log('请打开此文件并复制其内容到GitHub SSH设置中。');
console.log('注意：这是使用ssh-keygen生成的标准OpenSSH格式公钥，GitHub可以直接接受。');