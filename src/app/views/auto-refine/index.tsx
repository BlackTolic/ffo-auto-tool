import React, { useState } from 'react';
import { logger } from '../../../utils/logger';
import Card from '../../components/card/Card';
// 中文注释：引入全局通用样式（按钮、排版、弹框等），以 CSS Modules 方式使用
import globalStyles from '../../../styles/global.module.less';

// 中文注释：全自动刷炼化页面属性接口（预留扩展）
export interface AutoRefineProps {}

// 中文注释：新建动作的参数接口（预留后续扩展使用）
export interface CreateActionOptions {
  defaultName?: string; // 中文注释：新建项的默认名称（可选）
  templateId?: string; // 中文注释：使用的模板 ID（可选）
}

// 中文注释：启动操作的参数接口（预留扩展使用）
export interface StartActionOptions {
  taskName?: string; // 中文注释：要启动的任务名称（可选）
}

// 中文注释：停止操作的参数接口（预留扩展使用）
export interface StopActionOptions {
  taskName?: string; // 中文注释：要停止的任务名称（可选）
  force?: boolean; // 中文注释：是否强制停止（可选）
}

// 中文注释：配置数据结构接口，用于绑定弹框表单
export interface ConfigData {
  taskName: string; // 中文注释：任务名称
  templateId?: string; // 中文注释：模板 ID（可选）
}

// 中文注释：配置弹框组件的属性接口
export interface ConfigModalProps {
  open: boolean; // 中文注释：是否显示弹框
  data: ConfigData; // 中文注释：表单数据
  onChange: (data: ConfigData) => void; // 中文注释：表单变化回调
  onCancel: () => void; // 中文注释：点击取消回调
  onSave: (data: ConfigData) => void; // 中文注释：点击保存回调
}

// 中文注释：简单的配置弹框组件（局部、无需全局依赖）
const ConfigModal: React.FC<ConfigModalProps> = ({ open, data, onChange, onCancel, onSave }) => {
  if (!open) return null;
  return (
    <div className={globalStyles['modal-backdrop']}>
      <div className={globalStyles.modal}>
        <div className={globalStyles['modal-title']}>配置设置</div>
        <div className={globalStyles['modal-content']}>
          <label>
            <div>任务名称</div>
            <input className={globalStyles.input} value={data.taskName} onChange={e => onChange({ ...data, taskName: e.target.value })} placeholder="请输入任务名称" />
          </label>
          <label>
            <div>模板 ID（可选）</div>
            <input className={globalStyles.input} value={data.templateId || ''} onChange={e => onChange({ ...data, templateId: e.target.value })} placeholder="例如：default" />
          </label>
        </div>
        <div className={globalStyles['modal-actions']}>
          <button className={globalStyles.btn} onClick={onCancel}>
            取消
          </button>
          <button className={`${globalStyles.btn} ${globalStyles.primary}`} onClick={() => onSave(data)}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

// 中文注释：点击“新建”按钮的处理函数
const handleCreate = (opts?: CreateActionOptions) => {
  // 中文注释：此处暂为占位逻辑，后续可替换为打开弹窗/跳转配置页面
  logger.info('新建操作触发', opts);
};

const AutoRefineView: React.FC<AutoRefineProps> = () => {
  // 中文注释：记录“云荒一层西南角”任务是否处于运行中
  const [running, setRunning] = useState<boolean>(false);

  // 中文注释：配置弹框控制与数据
  const [configOpen, setConfigOpen] = useState<boolean>(false); // 中文注释：控制弹框显示
  const [configData, setConfigData] = useState<ConfigData>({ taskName: '云荒一层西南角', templateId: 'default' }); // 中文注释：配置表单数据

  // 中文注释：点击“启动”的处理函数 —— 调用预加载暴露的 API 触发主进程 toggle
  const handleStart = async (opts?: StartActionOptions) => {
    try {
      // @ts-ignore
      const ret = await window.ffoActions?.toggleYunHuang1West?.();
      if (ret?.ok) {
        setRunning(!!ret.running);
      } else {
        setRunning(false);
        if (ret?.message) {
          // 中文注释：简单提示错误信息（可替换为全局提示组件）
          alert(ret.message);
        }
      }
      logger.info('启动任务', opts, ret);
    } catch (e) {
      setRunning(false);
      alert(String((e as any)?.message || e));
    }
  };

  // 中文注释：点击“停止”的处理函数 —— 改为调用 pause（暂停当前动作，保留任务）
  const handleStop = async (opts?: StopActionOptions) => {
    try {
      // @ts-ignore
      const ret = await window.ffoActions?.pauseYunHuang1West?.();
      if (ret?.ok) {
        setRunning(false);
      } else if (ret?.message) {
        alert(ret.message);
      }
      logger.info('停止(暂停)任务', opts, ret);
    } catch (e) {
      alert(String((e as any)?.message || e));
    }
  };

  // 中文注释：点击“配置”按钮打开弹框
  const openConfig = () => setConfigOpen(true);
  const closeConfig = () => setConfigOpen(false);
  const saveConfig = (data: ConfigData) => {
    logger.info('保存配置', data);
    setConfigData(data);
    setConfigOpen(false);
  };

  return (
    <>
      {/* 中文注释：顶部主卡片，保留“新建”入口 */}
      <Card
        title="全自动刷炼化"
        subtitle="全自动刷炼化功能开发中（占位页面）"
        right={
          <button className={`${globalStyles.btn} ${globalStyles.primary}`} onClick={() => handleCreate()}>
            新建
          </button>
        }
      />

      {/* 中文注释：新增的任务卡片 —— 云荒一层西南角；停止时使用危险态红色背景 */}
      <Card
        title={configData.taskName || '云荒一层西南角'}
        subtitle={running ? '状态：运行中' : '状态：已停止'}
        tone={running ? 'normal' : 'danger'}
        right={
          <>
            {!running ? (
              <button className={`${globalStyles.btn} ${globalStyles.primary}`} onClick={() => handleStart({ taskName: configData.taskName })}>
                启动
              </button>
            ) : (
              <button className={`${globalStyles.btn} ${globalStyles.danger}`} onClick={() => handleStop({ taskName: configData.taskName })}>
                停止
              </button>
            )}
            <button className={globalStyles.btn} onClick={openConfig}>
              配置
            </button>
          </>
        }
      />

      {/* 中文注释：配置弹框 */}
      <ConfigModal open={configOpen} data={configData} onChange={setConfigData} onCancel={closeConfig} onSave={saveConfig} />
    </>
  );
};

export default AutoRefineView;
