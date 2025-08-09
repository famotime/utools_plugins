// always_on/preload.js
// 预加载脚本：与 index.html 通信，并在 Windows 上阻止屏保/休眠
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// 优先使用 Electron 的 powerSaveBlocker（更稳、更轻量）
let powerSaveBlocker = null;
let powerSaveBlockerId = null;
try {
  const electron = require('electron');
  if (electron && electron.powerSaveBlocker) {
    powerSaveBlocker = electron.powerSaveBlocker;
  }
} catch (e) {
  // 在某些环境可能不可用，回退到 PowerShell 方案
}

// 通过 SetThreadExecutionState 告知系统保持显示常亮（不移动鼠标）
let keepAwakeProcess = null;
let keepAwakeScriptPath = null;
let isUserStopping = false; // 标记用户是否主动停止
const stateFilePath = path.join(utools.getPath('temp'), 'always_on_state.json');

function writeState(pid, scriptPath) {
  try {
    const state = { pid, scriptPath };
    fs.writeFileSync(stateFilePath, JSON.stringify(state), { encoding: 'utf8' });
  } catch (e) {
    console.error('写入状态失败:', e);
  }
}

function readState() {
  try {
    if (fs.existsSync(stateFilePath)) {
      const raw = fs.readFileSync(stateFilePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('读取状态失败:', e);
  }
  return null;
}

function clearState() {
  try { if (fs.existsSync(stateFilePath)) fs.unlinkSync(stateFilePath); } catch (e) {}
}

function startPresentationModeIfAvailable() {
  try {
    const systemRoot = process.env.SystemRoot || 'C:\\\Windows';
    const exePath = path.join(systemRoot, 'System32', 'PresentationSettings.exe');
    if (fs.existsSync(exePath)) {
      exec(`"${exePath}" /start`);
    }
  } catch (e) {
    // 忽略
  }
}

function stopPresentationModeIfAvailable() {
  try {
    const systemRoot = process.env.SystemRoot || 'C:\\\Windows';
    const exePath = path.join(systemRoot, 'System32', 'PresentationSettings.exe');
    if (fs.existsSync(exePath)) {
      exec(`"${exePath}" /stop`);
    }
  } catch (e) {
    // 忽略
  }
}

function disableScreensaver() {
  const ps = `
$code = @"
using System;
using System.Runtime.InteropServices;
public static class Native {
  [DllImport(\"user32.dll\", SetLastError=true)]
  public static extern bool SystemParametersInfo(uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni);
}
"@
Add-Type -TypeDefinition $code
$SPI_SETSCREENSAVEACTIVE = 0x0011
$SPIF_UPDATEINIFILE = 0x01
$SPIF_SENDCHANGE = 0x02
$result = [Native]::SystemParametersInfo($SPI_SETSCREENSAVEACTIVE, 0, [IntPtr]::Zero, $SPIF_UPDATEINIFILE -bor $SPIF_SENDCHANGE)
Write-Host "屏保禁用结果: $result"
`;

  try {
    // 使用同步执行确保完成
    const { execSync } = require('child_process');
    const result = execSync('powershell -NoProfile -ExecutionPolicy Bypass -Command "' + ps.replace(/"/g, '\\"') + '"',
      { encoding: 'utf8', timeout: 5000 });
    console.log('屏保禁用执行结果:', result);
  } catch (error) {
    console.error('屏保禁用失败:', error);
  }
}

function enableScreensaver() {
  const ps = `
$code = @"
using System;
using System.Runtime.InteropServices;
public static class Native {
  [DllImport(\"user32.dll\", SetLastError=true)]
  public static extern bool SystemParametersInfo(uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni);
}
"@
Add-Type -TypeDefinition $code
$SPI_SETSCREENSAVEACTIVE = 0x0011
$SPIF_UPDATEINIFILE = 0x01
$SPIF_SENDCHANGE = 0x02
$result = [Native]::SystemParametersInfo($SPI_SETSCREENSAVEACTIVE, 1, [IntPtr]::Zero, $SPIF_UPDATEINIFILE -bor $SPIF_SENDCHANGE)
Write-Host "屏保启用结果: $result"
`;

  try {
    const { execSync } = require('child_process');
    const result = execSync('powershell -NoProfile -ExecutionPolicy Bypass -Command "' + ps.replace(/"/g, '\\"') + '"',
      { encoding: 'utf8', timeout: 5000 });
    console.log('屏保启用执行结果:', result);
  } catch (error) {
    console.error('屏保启用失败:', error);
  }
}

// 保存和恢复电源设置
let originalPowerSettings = null;

function savePowerSettings() {
  try {
    const { execSync } = require('child_process');
    // 获取当前显示器超时设置
    const monitorTimeout = execSync('powercfg /query SCHEME_CURRENT SUB_VIDEO VIDEOIDLE', { encoding: 'utf8' });
    // 获取当前睡眠超时设置
    const sleepTimeout = execSync('powercfg /query SCHEME_CURRENT SUB_SLEEP STANDBYIDLE', { encoding: 'utf8' });

    originalPowerSettings = {
      monitorTimeout: monitorTimeout,
      sleepTimeout: sleepTimeout
    };
    console.log('已保存原始电源设置');
  } catch (error) {
    console.error('保存电源设置失败:', error);
  }
}

function disablePowerTimeouts() {
  try {
    const { execSync } = require('child_process');
    // 禁用显示器超时（设置为0表示永不超时）
    execSync('powercfg /change monitor-timeout-ac 0', { encoding: 'utf8' });
    execSync('powercfg /change monitor-timeout-dc 0', { encoding: 'utf8' });
    // 禁用睡眠超时
    execSync('powercfg /change standby-timeout-ac 0', { encoding: 'utf8' });
    execSync('powercfg /change standby-timeout-dc 0', { encoding: 'utf8' });
    console.log('已禁用电源超时设置');
  } catch (error) {
    console.error('禁用电源超时失败:', error);
  }
}

function restorePowerSettings() {
  if (!originalPowerSettings) return;

  try {
    const { execSync } = require('child_process');
    // 这里简化处理，恢复为系统默认值
    // 实际应用中可以解析保存的设置并精确恢复
    execSync('powercfg /change monitor-timeout-ac 10', { encoding: 'utf8' });
    execSync('powercfg /change monitor-timeout-dc 5', { encoding: 'utf8' });
    execSync('powercfg /change standby-timeout-ac 30', { encoding: 'utf8' });
    execSync('powercfg /change standby-timeout-dc 15', { encoding: 'utf8' });
    console.log('已恢复电源设置');
  } catch (error) {
    console.error('恢复电源设置失败:', error);
  }
}

function startKeepAlive() {
  // 1) 尝试使用 Electron 内置方式
  if (powerSaveBlocker) {
    try {
      if (powerSaveBlockerId != null && powerSaveBlocker.isStarted(powerSaveBlockerId)) {
        console.log('powerSaveBlocker 已在运行');
        return;
      }
      powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
      const ok = powerSaveBlocker.isStarted(powerSaveBlockerId);
      if (ok) {
        console.log('已通过 powerSaveBlocker 启动常亮，ID:', powerSaveBlockerId);
        utools.showNotification('常亮已启动：阻止显示器休眠');
        return;
      } else {
        console.warn('powerSaveBlocker 启动失败，回退到 PowerShell 方案');
      }
    } catch (e) {
      console.warn('powerSaveBlocker 使用失败，回退到 PowerShell 方案:', e);
    }
  }

  // 2) 回退方案：PowerShell 进程
  if (keepAwakeProcess) {
    console.log('保活进程已在运行');
    return;
  }

  try {
    console.log('开始启动保活进程...');

    // 检查临时目录权限
    const tempDir = utools.getPath('temp');
    if (!fs.existsSync(tempDir)) {
      console.error('临时目录不存在:', tempDir);
      utools.showNotification('启动失败：临时目录不可访问');
      return;
    }

    // 保存原始电源设置
    savePowerSettings();
    // 禁用电源超时
    disablePowerTimeouts();
    // 禁用屏保（运行期间）
    disableScreensaver();

                            // 逐步测试脚本，先测试API加载
    const scriptContent =
`Write-Host "Always On - Keep Awake Script Started"
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "PowerShell PID: $PID"

try {
  Write-Host "Step 1: Loading Windows API..."

  # 使用简单的API定义方式
  $signature = @'
[DllImport("kernel32.dll", SetLastError = true)]
public static extern uint SetThreadExecutionState(uint esFlags);
'@

  $type = Add-Type -MemberDefinition $signature -Name "Win32PowerManagement" -Namespace "Win32Functions" -PassThru
  Write-Host "Step 2: Windows API loaded successfully"

  # 定义常量
  $ES_CONTINUOUS = [uint32]"0x80000000"
  $ES_SYSTEM_REQUIRED = [uint32]"0x00000001"
  $ES_DISPLAY_REQUIRED = [uint32]"0x00000002"

  Write-Host "Step 3: Constants defined"
  Write-Host "Step 4: Testing API call..."

  # 先测试一次API调用
  $flags = $ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED -bor $ES_DISPLAY_REQUIRED
  $result = $type::SetThreadExecutionState($flags)

  if ($result -eq 0) {
    Write-Host "Step 5: API test failed, returned 0"
  } else {
    Write-Host "Step 5: API test success, returned: 0x$($result.ToString('X8'))"
  }

    Write-Host "Step 6: Starting infinite keep-awake loop..."

  $counter = 0
  while ($true) {
    $counter++
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] Keep-awake operation #$counter"

    try {
      $result = $type::SetThreadExecutionState($flags)

      if ($result -eq 0) {
        Write-Host "Warning: SetThreadExecutionState failed, returned 0"
      } else {
        Write-Host "SetThreadExecutionState success, returned: 0x$($result.ToString('X8'))"
      }
    } catch {
      Write-Host "API call exception: $($_.Exception.Message)"
    }

    Write-Host "Sleeping for 10 seconds..."
    Start-Sleep -Seconds 10
    Write-Host "Sleep completed, continuing loop..."
  }
} catch {
  Write-Host "Script execution error:"
  Write-Host "Error message: $($_.Exception.Message)"
  Write-Host "Error type: $($_.Exception.GetType().FullName)"
  Write-Host "Stack trace: $($_.ScriptStackTrace)"
  exit 1
}
`;

    keepAwakeScriptPath = path.join(tempDir, 'keep_awake_simple.ps1');

    try {
      fs.writeFileSync(keepAwakeScriptPath, scriptContent, { encoding: 'utf8' });
      console.log('PowerShell脚本已创建:', keepAwakeScriptPath);

            // 跳过脚本测试，直接启动进程（避免超时）
      console.log('脚本已准备就绪，准备启动进程...');
    } catch (writeError) {
      console.error('创建PowerShell脚本失败:', writeError);
      utools.showNotification('启动失败：无法创建脚本文件');
      return;
    }

    // 解析 PowerShell 可执行路径并测试执行策略
    const systemRoot = process.env.SystemRoot || 'C:\\Windows';
    const psCandidates = [
      'powershell',
      path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      path.join(systemRoot, 'SysWOW64', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      path.join(systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell'),
    ];
    let psExe = psCandidates[0];
    try {
      const { execSync } = require('child_process');
      for (const candidate of psCandidates) {
        try {
          const versionResult = execSync(`"${candidate}" -NoProfile -Command "$PSVersionTable.PSVersion.Major"`, { encoding: 'utf8', timeout: 2000 });
          console.log(`找到PowerShell: ${candidate}, 版本: ${versionResult.trim()}`);

          // 测试执行策略
          const policyResult = execSync(`"${candidate}" -NoProfile -Command "Get-ExecutionPolicy"`, { encoding: 'utf8', timeout: 2000 });
          console.log(`PowerShell执行策略: ${policyResult.trim()}`);

          // 测试简单脚本执行
          const testResult = execSync(`"${candidate}" -NoProfile -ExecutionPolicy Bypass -Command "Write-Host 'PowerShell测试成功'"`, { encoding: 'utf8', timeout: 2000 });
          console.log(`PowerShell测试结果: ${testResult.trim()}`);

          psExe = candidate;
          break;
        } catch (e) {
          console.log(`PowerShell候选项 ${candidate} 测试失败:`, e.message);
        }
      }
    } catch (e) {
      console.error('PowerShell测试过程出错:', e);
    }

    // 尝试不同的PowerShell启动方式
    console.log('尝试启动PowerShell进程，使用执行文件:', psExe);
    console.log('脚本路径:', keepAwakeScriptPath);

    // 尝试使用-Command参数而不是-File
    const scriptCommand = `& "${keepAwakeScriptPath}"`;
    console.log('执行命令:', scriptCommand);

    keepAwakeProcess = spawn(psExe, [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command', scriptCommand
    ], {
      windowsHide: true,
      detached: false,  // 先不分离，确保能看到输出
      stdio: ['ignore', 'pipe', 'pipe']  // 启用输出捕获
    });

    console.log('PowerShell进程已启动，PID:', keepAwakeProcess.pid);

    // 捕获stdout输出
    if (keepAwakeProcess.stdout) {
      keepAwakeProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log('PowerShell输出:', output);
        // 如果看到成功消息，通知用户
        if (output.includes('开始保活循环') || output.includes('SetThreadExecutionState成功')) {
          console.log('保活功能正常运行');
        }
      });
    }

    // 捕获stderr输出
    if (keepAwakeProcess.stderr) {
      keepAwakeProcess.stderr.on('data', (data) => {
        const error = data.toString().trim();
        console.error('PowerShell错误:', error);
        // 显示详细错误信息给用户
        if (error.includes('异常') || error.includes('错误') || error.includes('失败')) {
          utools.showNotification('PowerShell执行错误: ' + error.substring(0, 50));
        }
      });
    }

    // 将子进程与父进程解耦，确保父进程退出后仍常驻
    try { keepAwakeProcess.unref(); } catch (e) {}

    // 记录 PID 以便后续停止/检测
    writeState(keepAwakeProcess.pid, keepAwakeScriptPath);

    // 监听进程事件
    keepAwakeProcess.on('error', (err) => {
      console.error('保持常亮进程启动失败:', err);
      console.error('错误详情:', err.stack);
      keepAwakeProcess = null;
      clearState();
      utools.showNotification('常亮启动失败：' + err.message);
    });

    keepAwakeProcess.on('exit', (code, signal) => {
      console.log('保活进程退出，代码:', code, '信号:', signal);
      console.log('进程运行时长:', new Date() - new Date());

      // 只有在非用户主动停止的情况下才显示异常退出提示
      if (code !== null && code !== 0 && !isUserStopping) {
        console.error('进程异常退出，退出代码:', code);
        utools.showNotification('常亮进程异常退出，代码: ' + code);
      } else if (code === 0 && !isUserStopping) {
        console.log('进程正常退出，可能是脚本执行完毕');
      } else if (isUserStopping) {
        console.log('进程被用户主动停止');
      }

      keepAwakeProcess = null;
      keepAwakeScriptPath = null;
      clearState();

      // 重置停止标志
      isUserStopping = false;
    });

    keepAwakeProcess.on('close', (code, signal) => {
      console.log('进程关闭事件，代码:', code, '信号:', signal);
    });

    // 多次验证进程状态，确保启动成功
    let verificationAttempts = 0;
    const maxAttempts = 3;

    const verifyProcess = () => {
      verificationAttempts++;
      try {
        // 如果主通道已通过 powerSaveBlocker 启动，则认为成功
        if (powerSaveBlocker && powerSaveBlockerId != null && powerSaveBlocker.isStarted(powerSaveBlockerId)) {
          console.log('powerSaveBlocker 已运行，跳过 PowerShell 进程验证');
          return;
        }

        if (!keepAwakeProcess || !keepAwakeProcess.pid) {
          console.error('进程对象无效');
          if (verificationAttempts < maxAttempts) {
            setTimeout(verifyProcess, 1000);
          } else {
            utools.showNotification('常亮启动失败：进程对象无效');
          }
          return;
        }

        const out = require('child_process').execSync(
          `tasklist /FI "PID eq ${keepAwakeProcess.pid}" /FO CSV`,
          { encoding: 'utf8', timeout: 5000 }
        ).toString();

        if (out.includes(`"${keepAwakeProcess.pid}"`)) {
          console.log('保活进程启动成功，PID:', keepAwakeProcess.pid);
          utools.showNotification('常亮已启动：通过系统 API 阻止屏保与系统睡眠');
        } else {
          console.error('保活进程启动失败：进程未找到');
          keepAwakeProcess = null;
          clearState();
          if (verificationAttempts < maxAttempts) {
            console.log(`第${verificationAttempts}次验证失败，${maxAttempts - verificationAttempts}次重试机会`);
            setTimeout(verifyProcess, 1000);
          } else {
            utools.showNotification('常亮启动失败：进程未能正常启动');
          }
        }
      } catch (e) {
        console.error('验证进程状态失败:', e);
        if (verificationAttempts < maxAttempts) {
          setTimeout(verifyProcess, 1000);
        } else {
          utools.showNotification('常亮启动失败：无法验证进程状态');
        }
      }
    };

    // 延迟验证，给进程足够的启动时间
    setTimeout(verifyProcess, 2000);

  } catch (error) {
    console.error('启动常亮失败:', error);
    utools.showNotification('启动失败：' + error.message);
  }
}

function stopKeepAlive() {
  try {
    // 标记用户主动停止
    isUserStopping = true;

    // 先停止 powerSaveBlocker（若存在）
    if (powerSaveBlocker && powerSaveBlockerId != null) {
      try {
        if (powerSaveBlocker.isStarted(powerSaveBlockerId)) {
          powerSaveBlocker.stop(powerSaveBlockerId);
        }
      } catch (_) { /* 忽略 */ }
      powerSaveBlockerId = null;
    }

    // 优先使用内存中的进程句柄
    if (keepAwakeProcess) {
      try { process.kill(keepAwakeProcess.pid); } catch (e) {}
      keepAwakeProcess = null;
    }

    // 读取持久化状态并尝试终止
    const state = readState();
    if (state && state.pid) {
      try {
        // 使用 taskkill 强制结束进程树
        exec(`taskkill /PID ${state.pid} /T /F`);
      } catch (e) {}
    }

    // 清理脚本文件
    // if (keepAwakeScriptPath && fs.existsSync(keepAwakeScriptPath)) {
    //   try { fs.unlinkSync(keepAwakeScriptPath); } catch (e) {}
    //   keepAwakeScriptPath = null;
    // }
    // if (state && state.scriptPath && fs.existsSync(state.scriptPath)) {
    //   try { fs.unlinkSync(state.scriptPath); } catch (e) {}
    // }
    clearState();

    // 可选：恢复连续状态（不强制显示需求）
    const clearScript = 'Add-Type -Namespace PowerManagement -Name NativeMethods -MemberDefinition @"using System.Runtime.InteropServices; public static class NativeMethods { [DllImport(\"kernel32.dll\")] public static extern uint SetThreadExecutionState(uint esFlags); }"@; [PowerManagement.NativeMethods]::SetThreadExecutionState(0x80000000) | Out-Null';
    exec('powershell -NoProfile -ExecutionPolicy Bypass -Command "' + clearScript.replace(/"/g, '\\"') + '"');

    // 恢复电源设置
    restorePowerSettings();
    // 重新启用屏保（恢复用户设置）
    enableScreensaver();

    utools.showNotification('常亮已关闭');
  } catch (error) {
    console.error('关闭常亮失败:', error);
  }
}

function getStatus() {
  // 若使用 powerSaveBlocker
  if (powerSaveBlocker && powerSaveBlockerId != null) {
    try {
      const running = powerSaveBlocker.isStarted(powerSaveBlockerId);
      if (running) {
        console.log('状态检查：powerSaveBlocker 运行中，ID:', powerSaveBlockerId);
        return true;
      }
    } catch (e) {
      console.warn('powerSaveBlocker 状态检查失败:', e);
    }
  }

  // 先看内存状态 - 但要确保进程真正存在
  if (keepAwakeProcess && keepAwakeProcess.pid) {
    try {
      // 使用更可靠的进程检查方式
      const out = require('child_process').execSync(
        `tasklist /FI "PID eq ${keepAwakeProcess.pid}" /FO CSV`,
        { encoding: 'utf8', timeout: 3000 }
      ).toString();

      if (out.includes(`"${keepAwakeProcess.pid}"`)) {
        console.log('进程状态检查：运行中，PID:', keepAwakeProcess.pid);
        return true;
      } else {
        // 进程已死，清理变量
        console.log('进程状态检查：进程不存在，清理状态');
        keepAwakeProcess = null;
        clearState();
        return false;
      }
    } catch (e) {
      // 检查失败，清理变量
      console.error('进程状态检查失败:', e);
      keepAwakeProcess = null;
      clearState();
      return false;
    }
  }

  // 再看持久化 PID 是否仍存活
  const state = readState();
  if (state && state.pid) {
    try {
      // Windows 下使用 tasklist 检查进程
      const out = require('child_process').execSync(
        `tasklist /FI "PID eq ${state.pid}" /FO CSV`,
        { encoding: 'utf8', timeout: 3000 }
      ).toString();

      const isRunning = out.includes(`"${state.pid}"`);
      if (isRunning) {
        console.log('持久化状态检查：进程运行中，PID:', state.pid);
        // 如果内存中没有进程对象，但持久化状态显示进程存在，尝试重新关联
        if (!keepAwakeProcess) {
          console.log('重新关联现有进程');
          // 注意：这里不能直接创建进程对象，只能记录状态
        }
      } else {
        console.log('持久化状态检查：进程不存在，清理状态');
        clearState();
      }
      return isRunning;
    } catch (e) {
      // 检查失败，清理状态
      console.error('持久化状态检查失败:', e);
      clearState();
      return false;
    }
  }

  console.log('状态检查：未找到运行中的进程');
  return false;
}


// 导出给前端使用的方法
window.start = startKeepAlive;
window.stop = stopKeepAlive;
window.getStatus = getStatus;
window.testScreensaver = testScreensaverStatus;

// 导出给 uTools 使用的方法
window.exports = {
  "always_on": {
    mode: "none",
    args: {
      enter: () => {
        const isRunning = getStatus();
        if (isRunning) {
          // 如果正在运行，则停止
          stopKeepAlive();
        } else {
          // 如果未运行，则启动
          startKeepAlive();
        }

        // 更新页面状态 - 延迟更长时间确保状态正确
        setTimeout(() => {
          if (document.getElementById('status') && window.updateStatus) {
            window.updateStatus();
          } else if (document.getElementById('status')) {
            const status = getStatus();
            document.getElementById('status').textContent = status ? '运行中' : '已停止';
            document.getElementById('status').className = status ? 'status running' : 'status stopped';
          }
        }, 1000);
      },
      // 供页面调用的方法
      start: startKeepAlive,
      stop: stopKeepAlive,
      getStatus: getStatus
    }
  }
};