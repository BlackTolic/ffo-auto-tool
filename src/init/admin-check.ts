import cp from 'child_process';
import { dialog, app } from 'electron';

// 中文注释：管理员检测结果接口
export interface AdminCheckResult {
  elevated: boolean; // 中文注释：是否已提升为管理员权限
  error?: string; // 中文注释：可选，检测过程中发生的异常信息
}

// 中文注释：管理员提示框选项接口
export interface AdminPromptOptions {
  title?: string; // 中文注释：弹框标题（默认“需要管理员权限”）
  message?: string; // 中文注释：主消息（默认“当前未以管理员权限运行”）
  detail?: string; // 中文注释：详细说明（默认提供如何以管理员运行的指引）
}

// 中文注释：检测当前进程是否以管理员权限运行（Windows 专用，调用 fltmc 验证）
export function isProcessElevated(): AdminCheckResult {
  try {
    cp.execSync('fltmc', { stdio: 'ignore' });
    return { elevated: true };
  } catch (e: any) {
    return { elevated: false, error: e?.message || String(e) };
  }
}

// 中文注释：未提升则弹框提示需要以管理员方式启动
export async function promptIfNotAdmin(options?: Partial<AdminPromptOptions>): Promise<AdminCheckResult> {
  const res = isProcessElevated();
  if (res.elevated) return res;

  const title = options?.title ?? '需要管理员权限';
  const message = options?.message ?? '当前未以管理员权限运行';
  const detail =
    options?.detail ??
    '部分功能（如大漠插件收费注册）需要管理员权限。\n\n请关闭当前程序后，右键以“管理员身份运行”启动，或在命令行以管理员权限运行。\n示例：以管理员权限打开 PowerShell，再执行应用。';

  try {
    await dialog.showMessageBox({
      type: 'warning',
      title,
      message,
      detail,
      buttons: ['我知道了'],
      defaultId: 0,
    });
  } catch {
    // 中文注释：弹框失败不影响后续逻辑
  }
  return res;
}