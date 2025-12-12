import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { 
  TrendingUp, LogOut, Loader2, KeyRound, 
  Briefcase, GraduationCap, PlusCircle, Gavel, Settings, Trash2,
  Info, Skull, Zap, Eye, AlertTriangle, ShieldAlert, FlaskConical,
  Activity, Radio, Target, CloudRain, Ban, FileText, MessageSquare, Send, Link as LinkIcon, User as UserIcon,
  Lock, Unlock, CheckCircle2, Menu, X, Terminal, BookOpen
} from 'lucide-react';
import { api } from './services/mockStore'; 
import { Market, User, Position, TimeRange, LeaderboardEntry, Transaction, ChatMessage, Outcome, MarketStatus } from './types';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  loading: boolean;
  register: (username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  systemConfig: { notification: string, eventMode: 'NONE' | 'A' | 'B' | 'C' | 'D' };
  setSystemNotification: (msg: string) => void;
  setSystemEventMode: (mode: 'NONE' | 'A' | 'B' | 'C' | 'D') => void;
  authError: string | null;
}
const AuthContext = createContext<AuthContextType>(null!);

// --- Helpers ---
const formatCurrency = (val: number | null | undefined) => {
  if (val === null || val === undefined || isNaN(val)) return '0.00';
  return val.toFixed(2);
};
const formatProb = (val: number) => Math.round(val * 100) + '%';
// getUsername is no longer needed, username is already available

// --- Components ---

const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block ml-1 align-middle">
        <Info size={14} className="text-gray-500 hover:text-[#42b4ca] cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-black border border-[#97ce4c] rounded text-xs text-[#97ce4c] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-[0_0_10px_rgba(151,206,76,0.2)]">
            {text}
        </div>
    </div>
);

const GuideModal = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-[#161b22] border-2 border-[#42b4ca] rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-[0_0_40px_rgba(66,180,202,0.2)]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-[#30363d] flex justify-between items-center bg-[#0d1117]">
                    <h2 className="text-[#42b4ca] font-bold text-lg uppercase tracking-widest flex items-center gap-2">
                        <BookOpen size={20} /> 操作指南
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6 text-gray-300 text-sm leading-relaxed font-mono">
                    <div className="bg-[#42b4ca]/10 border border-[#42b4ca] p-4 rounded text-[#42b4ca] text-xs mb-4">
                        欢迎！这是一个预测市场游戏，用你的判断来赚取能量。
                    </div>

                    <section>
                        <h3 className="text-white font-bold mb-2 border-l-4 border-[#97ce4c] pl-3">价格 = 概率</h3>
                        <p className="mb-2 text-gray-400">每个选项的价格代表市场认为它发生的概率。</p>
                        <ul className="list-disc list-inside space-y-2 ml-2">
                            <li><strong className="text-[#97ce4c]">例如：</strong> 选项 A 显示 0.40 E，意思是市场认为它有 40% 的概率发生。</li>
                            <li className="pl-4 border-l border-[#30363d] ml-1">
                                你觉得概率 <span className="text-[#97ce4c] font-bold">更高</span>？<span className="text-[#97ce4c] font-bold">买入</span>！
                            </li>
                            <li className="pl-4 border-l border-[#30363d] ml-1">
                                你觉得概率 <span className="text-[#ef4444] font-bold">更低</span>？<span className="text-[#ef4444] font-bold">卖出</span>！
                            </li>
                        </ul>
                        <div className="mt-3 bg-[#0d1117] p-3 rounded text-xs border border-[#30363d]">
                            <strong className="text-white block mb-1">两种赚钱方式：</strong>
                            • <span className="text-[#f0e14a]">短线交易</span>：低价买入，高价卖出，赚差价<br/>
                            • <span className="text-[#f0e14a]">长期持有</span>：买入后持有到结算，如果猜对了，每个份额获得 1.0 E（翻倍）
                        </div>
                    </section>

                    <section>
                        <h3 className="text-white font-bold mb-2 border-l-4 border-[#ef4444] pl-3">结算机制</h3>
                        <p className="mb-2 text-gray-400">管理员会在合适的时候结算市场，根据真实结果发放奖励。</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#97ce4c]/10 p-3 rounded border border-[#97ce4c]/30">
                                <div className="text-[#97ce4c] font-bold mb-1">✅ 猜对了</div>
                                你持有的选项是正确答案，每个份额获得 <span className="text-white font-bold">1.0 E</span>（100%回报）
                            </div>
                            <div className="bg-[#ef4444]/10 p-3 rounded border border-[#ef4444]/30">
                                <div className="text-[#ef4444] font-bold mb-1">❌ 猜错了</div>
                                你持有的选项是错误答案，每个份额变成 <span className="text-white font-bold">0 E</span>（全部归零）
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-white font-bold mb-2 border-l-4 border-[#f0e14a] pl-3">初始资金</h3>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2">
                                <Zap size={14} className="mt-1 text-[#f0e14a]" />
                                <span><strong className="text-white">实习生：</strong>1000 E 初始资金</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Zap size={14} className="mt-1 text-[#f0e14a]" />
                                <span><strong className="text-white">正式员工：</strong>5000 E 初始资金</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Skull size={14} className="mt-1 text-gray-500" />
                                <span><strong className="text-white">破产了？</strong>找管理员重置账户，重新开始。</span>
                            </li>
                        </ul>
                    </section>
                </div>
                <div className="p-4 border-t border-[#30363d] bg-[#0d1117] text-center">
                    <button onClick={onClose} className="bg-[#42b4ca] text-black font-bold px-8 py-2 rounded hover:bg-[#3aa3b8] uppercase tracking-widest text-xs">
                        Understood
                    </button>
                </div>
            </div>
        </div>
    );
};

const Navbar = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { user, logout, systemConfig } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
      
      {/* Top Status Bar - Mobile Optimized */}
      <div className="bg-[#97ce4c]/10 border-b-2 border-[#97ce4c] text-[#97ce4c] text-[10px] md:text-xs py-2 px-4 font-bold tracking-widest flex flex-col md:grid md:grid-cols-3 md:items-center gap-2 shadow-[0_0_20px_rgba(151,206,76,0.3)] z-[100] relative">
          {/* Left: Author */}
          <div className="flex justify-between md:justify-start items-center w-full">
            <a 
                href="https://ai.feishu.cn/wiki/LEPLw2CKsipp6JkUXracx1ORnOb?from=from_copylink" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors group"
            >
                <div className="bg-[#97ce4c] text-black p-0.5 rounded-sm group-hover:rotate-180 transition-transform">
                    <LinkIcon size={12} /> 
                </div>
                <span>Created by 王欣颖 Ash</span>
            </a>
            {/* Mobile Menu Toggle */}
            <button className="md:hidden text-[#97ce4c]" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                 {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>

          {/* Center: System Status */}
          <div className="flex items-center justify-center gap-2 animate-pulse w-full">
              <AlertTriangle size={12} />
              <span className="uppercase glitch-text text-center truncate">
                  {systemConfig.notification || "NO SIGNAL"}
              </span>
              <AlertTriangle size={12} />
          </div>

          {/* Right: Empty for desktop grid balance */}
          <div className="hidden md:block justify-self-end"></div>
      </div>

      <nav className="bg-[#0d1117]/90 border-b border-[#30363d] sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center cursor-pointer gap-2 group" onClick={() => onNavigate('home')}>
              <div className="border border-[#97ce4c] p-1.5 rounded-full shadow-[0_0_5px_rgba(151,206,76,0.4)] group-hover:bg-[#97ce4c] transition-all">
                  <FlaskConical className="h-5 w-5 text-[#97ce4c] group-hover:text-black" />
              </div>
              <div className="flex flex-col leading-none">
                  <span className="text-xl font-bold text-white tracking-widest" style={{fontFamily: 'Creepster, cursive'}}>UNIVERSE #404</span>
                  <span className="text-[10px] text-[#42b4ca] uppercase tracking-[0.2em]">Citadel Market</span>
              </div>
            </div>

            <div className="hidden md:flex flex-1">
            </div>

            {user && (
              <div className="hidden md:flex items-center gap-4">
                <button onClick={() => setShowGuide(true)} className="text-gray-400 hover:text-[#42b4ca] text-xs uppercase tracking-widest font-bold transition-colors flex items-center gap-1">
                    <BookOpen size={14} /> Guide
                </button>
                <div className="w-px h-4 bg-[#30363d]"></div>
                <button onClick={() => onNavigate('portfolio')} className="text-gray-400 hover:text-[#97ce4c] text-xs uppercase tracking-widest font-bold transition-colors">Entanglements</button>
                <button onClick={() => onNavigate('history')} className="text-gray-400 hover:text-[#f0e14a] text-xs uppercase tracking-widest font-bold transition-colors flex items-center gap-1">
                    <Activity size={14} /> History
                </button>
                {user.isAdmin && <button onClick={() => onNavigate('admin')} className="text-[#ef4444] text-xs uppercase tracking-widest font-bold hover:shadow-[0_0_5px_red] transition-all">Gatekeeper</button>}
                
                <div className="flex items-center gap-3 bg-[#161b22] rounded border border-[#30363d] px-3 py-1.5 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Zap size={14} className="text-[#97ce4c] fill-[#97ce4c]" />
                        <span className="text-white font-bold text-sm font-mono">{formatCurrency(user.balance)} E</span>
                    </div>
                    <div className="w-px h-4 bg-[#30363d]"></div>
                    <button onClick={() => logout()} className="text-gray-500 hover:text-[#ef4444]">
                      <LogOut size={14} />
                    </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && user && (
            <div className="md:hidden bg-[#161b22] border-b border-[#30363d] p-4 space-y-4 animate-in slide-in-from-top-5">
                <div className="flex items-center gap-2 text-white font-mono border-b border-[#30363d] pb-2">
                    <Zap size={14} className="text-[#97ce4c]" />
                    <span className="font-bold">{formatCurrency(user.balance)} E</span>
                </div>
                <button onClick={() => {setShowGuide(true); setIsMobileMenuOpen(false);}} className="block w-full text-left text-[#42b4ca] hover:text-[#97ce4c] text-xs uppercase tracking-widest font-bold">Observation Guide</button>
                <button onClick={() => {onNavigate('portfolio'); setIsMobileMenuOpen(false);}} className="block w-full text-left text-gray-300 hover:text-[#97ce4c] text-xs uppercase tracking-widest font-bold">My Entanglements</button>
                <button onClick={() => {onNavigate('history'); setIsMobileMenuOpen(false);}} className="block w-full text-left text-gray-300 hover:text-[#f0e14a] text-xs uppercase tracking-widest font-bold">Transaction History</button>
                {user.isAdmin && <button onClick={() => {onNavigate('admin'); setIsMobileMenuOpen(false);}} className="block w-full text-left text-[#ef4444] text-xs uppercase tracking-widest font-bold">Gatekeeper Console</button>}
                <button onClick={logout} className="block w-full text-left text-gray-500 hover:text-[#ef4444] text-xs uppercase tracking-widest font-bold">Disconnect</button>
            </div>
        )}
      </nav>
    </>
  );
};

const IntroOverlay = ({ onComplete }: { onComplete: () => void }) => {
    const [text, setText] = useState('');
    const [skipped, setSkipped] = useState(false);
    const [showSkipButton, setShowSkipButton] = useState(false);
    // Updated text: removed newline between "审判时刻" and "届时"
    const fullText = `《平行宇宙·员工生存守则》\n\n警告：阅读本文档即视为你已签署《认知风险豁免协议》。如果在阅读过程中感到眩晕、或是看到工牌上的照片变成了猫，请立即停止阅读并前往最近的零食货架摄入糖分。\n\n\n\n欢迎来到第404号平行宇宙。在这里，你的每一个判断都可以变现为能量。请自行甄别以下规则的真伪：\n\n- 价格（E）= 概率。如果某个选项显示 0.40 E，意思是市场认为它有 40% 的概率发生。你觉得概率更高？买入 注入期望。\n\n- 每次交易都会影响价格，大额的能量流动将导致剧烈震荡。\n\n- 无论您在盘中拥有多少账面浮盈，周日晚 23:59 是本宇宙的"审判时刻"\n\n  - 届时，系统将强制与现实世界的真实成交均价进行校准。只有押中正确的观测者，才能获得 100% 的能量回馈。\n\n  - 警告：不要试图通过囤积现实礼盒来影响虚拟价格，因果律武器的反噬是你无法承受的。\n\n- 本所每日10:30开盘。如果您在10:29看到K线在跳动，请立即关闭屏幕并默念"那是幻觉"三遍。\n\n- 积分归零即视为生物性死亡。你有一次复活的机会，但死神可能会随机取你500积分作为过路费。\n\n- 交易所的管理员是人类，不是AI，也不是一只带着工牌的猫。如果你看到管理员头像变成了猫，请不要给它投喂猫条，立即下线并切断电源。\n\n- 如果你看到行情价格变成了 444，请不要买入，也不要卖出。静静等待一分钟，直到数字波动。\n\n- 严禁利用Bug刷分。系统后台有"老大哥"看着你，他手里有封号的红按钮。\n\n- 本宇宙"Sirena"同事正在休假。如果您收到来自Sirena的路线，请立即上报。\n\n- 最终解释权归平行宇宙管理委员会所有。\n\n  \n\n[平行宇宙管理委员会]`;
    const [index, setIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // 3秒后显示跳过按钮
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSkipButton(true);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!skipped && index < fullText.length) {
            const timeout = setTimeout(() => {
                setText(prev => prev + fullText.charAt(index));
                setIndex(prev => prev + 1);
                if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 30); 
            return () => clearTimeout(timeout);
        }
    }, [index, skipped]);

    const handleSkip = () => {
        setSkipped(true);
        setText(fullText);
        setIndex(fullText.length);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#0d1117] text-[#97ce4c] font-mono p-4 md:p-8 flex flex-col items-center justify-center selection:bg-[#97ce4c] selection:text-black">
            {/* 跳过按钮 - 放在上方，3秒后显示 */}
            {showSkipButton && index < fullText.length && (
                <div className="w-full max-w-3xl mb-4 flex justify-end animate-in fade-in slide-in-from-top-2">
                    <button 
                        onClick={handleSkip}
                        className="px-6 py-2 bg-[#ef4444]/10 border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444] hover:text-black transition-all font-bold tracking-widest uppercase rounded text-xs"
                    >
                        我晕字，让我跳过
                    </button>
                </div>
            )}
            
            <div className="w-full max-w-3xl mb-8 flex justify-center">
                <Eye className="w-12 h-12 animate-pulse text-[#97ce4c]" />
            </div>
            <div ref={scrollRef} className="w-full max-w-3xl h-3/4 overflow-y-auto border-2 border-[#97ce4c] p-8 rounded bg-[#0d1117] shadow-[0_0_20px_rgba(151,206,76,0.2)] relative">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none z-10 opacity-50"></div>
                {/* Updated: leading-loose for better readability */}
                <pre className="whitespace-pre-wrap leading-loose text-sm md:text-base font-bold relative z-0 text-[#97ce4c]" style={{ fontFamily: "'Space Mono', monospace" }}>
                    {text}<span className="animate-pulse inline-block w-3 h-5 bg-[#97ce4c] ml-1 align-middle"></span>
                </pre>
            </div>
            <div className="mt-4">
                <button 
                    onClick={onComplete}
                    className={`px-10 py-4 bg-[#97ce4c]/10 border border-[#97ce4c] text-[#97ce4c] hover:bg-[#97ce4c] hover:text-black transition-all font-bold tracking-widest uppercase rounded shadow-[0_0_15px_rgba(151,206,76,0.1)] ${index < fullText.length ? 'opacity-50 cursor-wait grayscale' : 'opacity-100 hover:shadow-[0_0_30px_rgba(151,206,76,0.6)]'}`}
                    disabled={index < fullText.length}
                >
                    [ I Accept The Entropy ]
                </button>
            </div>
        </div>
    );
};

const CoreRulesOverlay = ({ onComplete }: { onComplete: () => void }) => {
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            onComplete();
        }
    }, [countdown, onComplete]);

    return (
        <div className="fixed inset-0 z-[100] bg-[#0d1117] text-[#97ce4c] font-mono flex items-center justify-center p-4">
            <div className="max-w-2xl w-full space-y-8 animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-[#42b4ca]/10 mb-6 border-2 border-[#42b4ca] shadow-[0_0_20px_rgba(66,180,202,0.3)]">
                        <AlertTriangle className="h-8 w-8 text-[#42b4ca]" />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-widest uppercase mb-2" style={{fontFamily: 'Creepster'}}>
                        最后提示游戏规则
                    </h2>
                    <div className="text-xs text-gray-500 font-mono">
                        {countdown > 0 ? `自动进入 ${countdown} 秒...` : '正在进入...'}
                    </div>
                </div>

                <div className="bg-[#161b22] border-2 border-[#42b4ca] rounded-xl p-8 space-y-6 shadow-[0_0_30px_rgba(66,180,202,0.2)]">
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#97ce4c]/20 flex items-center justify-center border border-[#97ce4c]">
                                <span className="text-[#97ce4c] font-bold text-lg">1</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[#97ce4c] font-bold mb-2 text-lg">能量（本世界货币单位）= 概率</h3>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    例如 <span className="text-[#42b4ca] font-bold">0.40 E</span> 意味着 <span className="text-[#42b4ca] font-bold">40%</span> 的发生概率。
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#42b4ca]/20 flex items-center justify-center border border-[#42b4ca]">
                                <span className="text-[#42b4ca] font-bold text-lg">2</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[#42b4ca] font-bold mb-2 text-lg">交易逻辑</h3>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    <span className="text-[#97ce4c] font-bold">觉得概率高就买入</span>，<span className="text-[#ef4444] font-bold">觉得概率低就卖出</span>。
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#f0e14a]/20 flex items-center justify-center border border-[#f0e14a]">
                                <span className="text-[#f0e14a] font-bold text-lg">3</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-[#f0e14a] font-bold mb-2 text-lg">结算机制</h3>
                                <p className="text-gray-300 text-sm leading-relaxed">
                                    每周日结算，<span className="text-[#97ce4c] font-bold">押中获利 (1.0 E)</span>，<span className="text-[#ef4444] font-bold">押错归零 (0 E)</span>。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RoleModal = ({ onSelect }: { onSelect: (role: 'INTERN' | 'FULL_TIME') => Promise<void> }) => {
   const [loading, setLoading] = useState<string | null>(null);
   const handleSelect = async (role: 'INTERN' | 'FULL_TIME') => {
      setLoading(role);
      try { await onSelect(role); } 
      catch (e: any) { setLoading(null); alert(e.message); }
   };
   return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm font-mono">
      <div className="bg-[#161b22] border-2 border-[#97ce4c] rounded-xl p-8 max-w-2xl w-full mx-4 shadow-[0_0_30px_rgba(151,206,76,0.2)] relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-[#97ce4c]"></div>
         <h2 className="text-3xl font-bold text-[#97ce4c] mb-2 text-center relative z-10 uppercase tracking-widest font-['Creepster']">Select Timeline Identity</h2>
         <p className="text-[#42b4ca] text-center mb-8 relative z-10 text-xs">WARNING: This choice is permanent for this cycle.</p>
         <div className="grid md:grid-cols-2 gap-6 relative z-10">
            <button onClick={() => handleSelect('INTERN')} disabled={!!loading} className="group relative bg-[#0d1117] hover:bg-[#1f2937] border border-[#30363d] hover:border-[#97ce4c] p-6 rounded-xl transition-all text-left">
                <div className="absolute top-4 right-4 text-gray-700 group-hover:text-[#97ce4c]"><GraduationCap size={24} /></div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#97ce4c]">Class D (Intern)</h3>
                <div className="text-3xl font-bold text-[#97ce4c] mb-4">1,000 E</div>
                <div className="text-xs text-gray-500">Daily Entropy: -30 E</div>
            </button>
            <button onClick={() => handleSelect('FULL_TIME')} disabled={!!loading} className="group relative bg-[#0d1117] hover:bg-[#1f2937] border border-[#30363d] hover:border-[#42b4ca] p-6 rounded-xl transition-all text-left">
                <div className="absolute top-4 right-4 text-gray-700 group-hover:text-[#42b4ca]"><Briefcase size={24} /></div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#42b4ca]">正式员工</h3>
                <div className="text-3xl font-bold text-[#42b4ca] mb-4">5,000 E</div>
                <div className="text-xs text-gray-500">每日消耗：-150 E</div>
            </button>
         </div>
      </div>
   </div>
   );
};

const GlobalChat = () => {
    const { user } = useContext(AuthContext);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    
    // FIX: Use container ref to scroll only the chat box, not the window
    const containerRef = useRef<HTMLDivElement>(null);

    const load = async () => {
        try { 
            const msgs = await api.getChatMessages(); 
            setMessages(msgs); 
        } 
        catch (e) { console.error(e); }
    };

    useEffect(() => {
        load();
        const interval = setInterval(load, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // FIX: Scroll the CONTAINER, not scrollIntoView
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !user) return;
        setLoading(true);
        try { 
            await api.sendChatMessage(input.trim()); 
            setInput(''); 
            await load(); 
        } 
        catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    return (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col h-[300px] mt-8">
             <div className="p-3 border-b border-[#30363d] flex items-center justify-between bg-[#0d1117] rounded-t-xl">
                 <h3 className="text-xs font-bold text-[#97ce4c] uppercase tracking-widest flex items-center gap-2">
                     <MessageSquare size={14} /> Citadel Comm-Link
                 </h3>
                 <div className="text-[10px] text-gray-600 animate-pulse">LIVE FEED</div>
             </div>
             
             <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                 {messages.length === 0 && <div className="text-center text-gray-600 text-xs italic">Frequency silent...</div>}
                 {messages.map(m => (
                     <div key={m.id} className="flex flex-col gap-1">
                         <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-[#42b4ca]">{m.username}</span>
                             <span className="text-[10px] text-gray-600">{new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                         </div>
                         <div className="bg-[#0d1117] p-2 rounded border border-[#30363d] text-xs text-gray-300 break-words">
                             {m.content}
                         </div>
                     </div>
                 ))}
             </div>

             <form onSubmit={handleSend} className="p-3 border-t border-[#30363d] flex gap-2">
                 <input 
                    value={input} 
                    onChange={e=>setInput(e.target.value)}
                    placeholder={user ? "Transmit message..." : "Login to transmit"}
                    disabled={!user || loading}
                    className="flex-1 bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-xs text-white focus:border-[#97ce4c] outline-none transition-colors"
                 />
                 <button disabled={!user || loading || !input} className="bg-[#97ce4c] text-black p-2 rounded hover:bg-[#b2df28] disabled:opacity-50 disabled:grayscale">
                     {loading ? <Loader2 size={16} className="animate-spin"/> : <Send size={16} />}
                 </button>
             </form>
        </div>
    );
};

// ... Login Component ...
const Login = () => {
    const { register, login, refreshUser, authError } = useContext(AuthContext);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      
      // Validation
      if (!username.trim()) {
        setError('Username is required');
        return;
      }
      if (username.length < 3 || username.length > 20) {
        setError('Username must be 3-20 characters');
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError('Username can only contain letters, numbers, and underscores');
        return;
      }
      if (!password) {
        setError('Password is required');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      
      setIsSubmitting(true);
      try { 
        // 首次登录自动注册：如果登录失败（用户不存在），自动尝试注册
        try {
          await login(username.trim(), password);
        } catch (loginErr: any) {
          // 如果登录失败且错误是"Invalid username or password"，尝试自动注册
          if (loginErr.message?.includes('Invalid username or password') || loginErr.message?.includes('Invalid')) {
            // 自动注册
            await register(username.trim(), password);
          } else {
            throw loginErr;
          }
        }
        await refreshUser();
      } 
      catch (err: any) { 
        setError(err.message || 'Authentication failed'); 
      } 
      finally { 
        setIsSubmitting(false); 
      }
    };
  
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117] px-4 font-mono">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="inline-block relative group">
               <Eye className="mx-auto h-20 w-20 text-[#97ce4c] relative z-10 group-hover:rotate-180 transition-transform duration-700" />
               <div className="absolute inset-0 bg-[#97ce4c] blur-2xl opacity-20"></div>
            </div>
            <h2 className="mt-6 text-5xl font-black text-white glitch-text" data-text="Universe #404" style={{fontFamily: 'Creepster'}}>Universe #404</h2>
            <p className="mt-2 text-sm text-[#42b4ca] uppercase tracking-[0.3em]">Citadel Observation Hub</p>
          </div>
          
          {authError && (
              <div className="bg-red-900/20 border border-red-500 text-red-500 p-4 rounded text-xs text-center font-bold">
                  CRITICAL FAILURE: {authError}. <br/>
                  Please verify API credentials in services/mockStore.ts.
              </div>
          )}
  
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {/* Username Input */}
            <div>
              <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="block w-full px-4 py-3 border border-[#30363d] bg-[#161b22] text-white rounded-md focus:border-[#97ce4c] focus:shadow-[0_0_10px_rgba(151,206,76,0.3)] outline-none transition-all placeholder-gray-600" 
                placeholder="Enter your username" 
                disabled={isSubmitting}
              />
              <p className="text-[10px] text-gray-600 mt-1">3-20 个字符，只能包含字母、数字、下划线</p>
              <p className="text-[10px] text-[#42b4ca] mt-1">💡 首次登录会自动注册，用户名不能重复</p>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs text-gray-500 mb-2 uppercase tracking-widest">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="block w-full px-4 py-3 border border-[#30363d] bg-[#161b22] text-white rounded-md focus:border-[#97ce4c] focus:shadow-[0_0_10px_rgba(151,206,76,0.3)] outline-none transition-all placeholder-gray-600" 
                placeholder="Enter your password" 
                disabled={isSubmitting}
              />
              <p className="text-[10px] text-gray-600 mt-1">至少 6 个字符</p>
            </div>

            {/* 移除确认密码字段，因为现在首次登录会自动注册 */}

            {error && <div className="text-[#ef4444] text-xs text-center border border-[#ef4444] bg-[#ef4444]/10 p-2 font-bold">{error}</div>}
            
            <button 
              type="submit" 
              disabled={isSubmitting || !username.trim() || !password} 
              className="w-full py-3 px-4 rounded-md text-black font-bold bg-[#97ce4c] hover:bg-[#b2df28] hover:shadow-[0_0_15px_rgba(151,206,76,0.5)] disabled:opacity-50 uppercase tracking-widest transition-all"
            >
              {isSubmitting 
                ? 'Signing In...' 
                : 'Sign In / Auto Register'
              }
            </button>

            {/* 移除注册/登录切换按钮，因为现在首次登录会自动注册 */}
          </form>
        </div>
      </div>
    );
};

const Leaderboard = () => {
    const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
    useEffect(() => { api.getLeaderboard().then(setLeaders).catch(console.error); }, []);
    return (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4">
            <h3 className="text-xs font-bold text-[#42b4ca] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Skull size={14} /> Top Survivors
            </h3>
            <div className="space-y-3">
                {leaders.map((l, i) => (
                    <div key={l.userId} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${i===0?'bg-[#f0e14a] text-black shadow-[0_0_10px_#f0e14a]':'bg-[#30363d] text-gray-400'}`}>
                            {i+1}
                        </div>
                        <div className="flex-1">
                             <div className="text-xs text-gray-300 font-mono">{l.username}</div>
                        </div>
                        <div className="text-xs text-[#97ce4c] font-bold font-mono">{formatCurrency(l.balance)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MarketList = ({ onSelectMarket }: { onSelectMarket: (id: string) => void }) => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMarkets().then(data => { setMarkets(data); setLoading(false); }).catch(err => {
        console.error(err);
        setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#97ce4c]" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar */}
      <div className="lg:col-span-1 space-y-6">
          <Leaderboard />
      </div>

      {/* Main Grid */}
      <div className="lg:col-span-3">
        <h2 className="text-xl font-bold text-white mb-6 font-mono tracking-wider flex items-center gap-2">
            <Zap size={20} className="text-[#f0e14a]" /> Active Nexus Events
        </h2>
        
        {markets.length === 0 ? (
            <div className="text-center py-20 text-gray-600 border border-dashed border-[#30363d] rounded-xl">
                <p>暂无市场</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {markets.map(market => {
                // FIX: Explicitly find the highest priced outcome, default to first if all equal or empty
                const topOutcome = market.outcomes.length > 0 
                    ? [...market.outcomes].sort((a,b) => b.price - a.price)[0]
                    : null;

                return (
                    <div key={market.id} onClick={() => onSelectMarket(market.id)} className="bg-[#161b22] border border-[#30363d] hover:border-[#97ce4c] rounded-xl p-5 cursor-pointer transition-all group relative overflow-hidden hover:shadow-[0_0_15px_rgba(151,206,76,0.1)]">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#97ce4c]/10 to-transparent rounded-bl-3xl"></div>
                        
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${market.status==='OPEN' ? 'bg-[#97ce4c]/10 text-[#97ce4c] border border-[#97ce4c]/30' : 'bg-gray-800 text-gray-500'}`}>
                                {market.status}
                            </span>
                            <span className="text-xs text-gray-500 font-mono">Vol: {formatCurrency(market.totalVolume)}</span>
                        </div>
                        
                        <h3 className="font-bold text-slate-200 leading-snug line-clamp-2 mb-2 group-hover:text-[#97ce4c] transition-colors">{market.question}</h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-6 font-mono">{market.description}</p>
                        
                        {topOutcome && (
                            <div className="bg-[#0d1117] rounded p-2 flex items-center justify-between border border-[#30363d]">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#42b4ca] animate-pulse"></div>
                                    <span className="text-xs text-gray-300 font-medium">Consensus: {topOutcome.name}</span>
                                </div>
                                <span className="text-sm text-[#42b4ca] font-bold font-mono">{formatProb(topOutcome.price)}</span>
                            </div>
                        )}
                    </div>
                );
                })}
            </div>
        )}

        <GlobalChat />

      </div>
    </div>
  );
};

const SentimentBar = ({ outcomes, userPositions }: { outcomes: any[], userPositions: Position[] }) => {
    return (
        <div className="w-full h-3 bg-[#0d1117] rounded-full overflow-hidden flex mb-6 border border-[#30363d]">
            {outcomes.map((o, i) => (
                <div 
                    key={o.id} 
                    className="h-full transition-all duration-500" 
                    style={{
                        width: `${o.price * 100}%`, 
                        backgroundColor: ['#97ce4c', '#42b4ca', '#f0e14a', '#ef4444'][i%4]
                    }}
                ></div>
            ))}
        </div>
    );
};

const OrderBookVisual = ({ transactions, outcomeName }: { transactions: Transaction[], outcomeName: string }) => {
    // Limit to last 20 transactions for calculation to match user request of "Recent"
    const recentTx = transactions.slice(0, 20);

    // Calculate Buy vs Sell pressure based on SHARES volume in recent transactions
    const buyVol = recentTx.filter(t => t.type === 'BUY').reduce((acc, t) => acc + t.shares, 0);
    const sellVol = recentTx.filter(t => t.type === 'SELL').reduce((acc, t) => acc + t.shares, 0);
    const total = buyVol + sellVol || 1;
    const buyPct = (buyVol / total) * 100;
    const sellPct = (sellVol / total) * 100;

    return (
        <div className="mt-2 mb-4 px-4 py-2 bg-[#0d1117]/50 border-t border-[#30363d] animate-in slide-in-from-top-2 fade-in">
            <div className="flex justify-between items-center mb-1">
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={10} /> Recent Volume Pressure (Last 20)
                </div>
            </div>
            
            {/* Pressure Bar */}
            <div className="w-full h-2 bg-[#0d1117] rounded-full flex overflow-hidden border border-[#30363d] relative">
                 <div style={{width: `${buyPct}%`}} className="h-full bg-[#97ce4c] transition-all duration-500"></div>
                 <div style={{width: `${sellPct}%`}} className="h-full bg-[#ef4444] transition-all duration-500"></div>
            </div>
            <div className="flex justify-between text-[9px] font-bold mt-1">
                <span className="text-[#97ce4c]">{buyPct.toFixed(0)}% Buys ({buyVol.toFixed(0)})</span>
                <span className="text-[#ef4444]">{sellPct.toFixed(0)}% Sells ({sellVol.toFixed(0)})</span>
            </div>
            {recentTx.length === 0 && <div className="text-[8px] text-gray-600 mt-1 italic text-center">No recent data</div>}
        </div>
    );
};

const MarketDetail = ({ marketId, onBack }: { marketId: string, onBack: () => void }) => {
  const { user, refreshUser, systemConfig } = useContext(AuthContext);
  const [market, setMarket] = useState<Market | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const [tab, setTab] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isTrading, setIsTrading] = useState(false);
  const [userPositions, setUserPositions] = useState<Position[]>([]);

  const refreshData = useCallback(async () => {
    try {
        const [m, h, p, t] = await Promise.all([
          api.getMarket(marketId),
          api.getMarketHistory(marketId, timeRange),
          user ? api.getUserPositions(user.id) : Promise.resolve([]),
          api.getMarketTransactions(marketId)
        ]);
        if (m) {
            // FIX: Strict Sort by Name to ensure Color Index Consistency with Chart
            m.outcomes.sort((a,b) => a.name.localeCompare(b.name));
            setMarket(m);
            if (!selectedOutcomeId && m.outcomes.length > 0) setSelectedOutcomeId(m.outcomes[0].id);
        }
        setHistory(h);
        setUserPositions(p.filter(pos => pos.marketId === marketId));
        setTransactions(t);
    } catch (e) {
        console.error(e);
    }
  }, [marketId, user, selectedOutcomeId, timeRange]);

  useEffect(() => { refreshData(); }, [refreshData]);

  const handleTrade = async () => {
      if(!selectedOutcomeId || !amount) return;
      setIsTrading(true);
      try {
          const val = parseFloat(amount);
          if (tab === 'BUY') await api.buy(marketId, selectedOutcomeId, val);
          else await api.sell(marketId, selectedOutcomeId, val);
          setAmount(''); 
          
          // Force refresh user balance after trade (wait a bit for database to update)
          setTimeout(async () => {
              await refreshUser();
              await refreshData();
          }, 300);
          
          // Also refresh immediately
          await refreshUser();
          await refreshData();
      } catch (e: any) { alert(e.message); } 
      finally { setIsTrading(false); }
  };

  if (!market) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#97ce4c]" /></div>;

  const selectedOutcome = market.outcomes.find(o => o.id === selectedOutcomeId);
  const inputVal = parseFloat(amount) || 0;
  
  // FIX: Lock Logic is now MANUAL ONLY based on Status
  // We ignore the date check for locking to allow manual overrides
  const isLocked = market.status === 'LOCKED' || market.status === 'RESOLVED';
  const isResolved = market.status === 'RESOLVED';

  // Winning Info
  const winningOutcome = market.outcomes.find(o => o.id === market.winningOutcomeId);

  // Events Logic
  const volatilityMultiplier = systemConfig.eventMode === 'A' ? 2 : 1; 
  const isFogMode = systemConfig.eventMode === 'D';

  let executionPrice = 0, estShares = 0;
  if (selectedOutcome) {
      const impact = (inputVal * 0.0001) * volatilityMultiplier;
      executionPrice = tab === 'BUY' 
         ? Math.min(0.99, selectedOutcome.price + impact) 
         : Math.max(0.01, selectedOutcome.price - impact);
      estShares = tab === 'BUY' ? inputVal / executionPrice : 0;
  }
  
  // Formatters that respect Fog Mode
  const displayProb = (val: number) => isFogMode ? '??%' : formatProb(val);

  // --- Dynamic Button Logic ---
  let buttonText = '确认交易';
  let isButtonDisabled = isTrading || isLocked || inputVal <= 0;

  if (isLocked) {
      buttonText = isResolved ? '市场已结算' : '市场已锁定';
      isButtonDisabled = true;
  } else if (!inputVal || inputVal <= 0) {
      buttonText = '请输入数量';
      isButtonDisabled = true;
  } else if (isTrading) {
      buttonText = '处理中...';
      isButtonDisabled = true;
  }

  return (
    <div className={`max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-12 gap-8 ${systemConfig.eventMode === 'A' ? 'animate-pulse border-red-500/20 border' : ''}`}>
      {/* Event A Overlay */}
      {systemConfig.eventMode === 'A' && (
          <div className="fixed inset-0 pointer-events-none z-0 bg-red-500/5 mix-blend-overlay"></div>
      )}

      <div className="lg:col-span-8 space-y-6 relative z-10">
         <button onClick={onBack} className="text-gray-500 hover:text-[#97ce4c] flex items-center text-xs uppercase tracking-widest mb-4 transition-colors">&larr; 返回市场列表</button>
         
         <div>
            <div className="flex items-center gap-3 mb-2">
                <span className="text-[#97ce4c] font-mono text-xs border border-[#97ce4c]/30 px-2 py-0.5 rounded">ID: {market.id.slice(0,8)}</span>
                <span className="text-gray-500 text-xs font-mono">{new Date(market.createdAt).toLocaleDateString()}</span>
                {isLocked && !isResolved && <span className="bg-[#ef4444] text-black text-xs font-bold px-2 py-0.5 rounded animate-pulse">LOCKED</span>}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 font-mono">{market.question}</h1>
            <p className="text-gray-400 font-mono text-sm border-l-2 border-[#30363d] pl-4 whitespace-pre-line">{market.description}</p>
         </div>

         {/* Resolution Banner - MOVED HERE */}
         {isResolved && winningOutcome && (
             <div className="bg-[#97ce4c]/20 border border-[#97ce4c] rounded-xl p-6 text-center animate-in zoom-in duration-300 shadow-[0_0_30px_rgba(151,206,76,0.1)]">
                 <h2 className="text-xl font-bold text-[#97ce4c] uppercase tracking-widest mb-2 font-['Creepster']">Timeline Collapsed</h2>
                 <div className="text-sm text-gray-300 mb-4 font-mono">The quantum state has resolved.</div>
                 <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                     <div className="bg-[#0d1117] p-3 rounded border border-[#97ce4c]/30">
                         <div className="text-[10px] text-gray-500 uppercase">Winning Timeline</div>
                         <div className="text-lg font-bold text-white">{winningOutcome.name}</div>
                     </div>
                     <div className="bg-[#0d1117] p-3 rounded border border-[#97ce4c]/30">
                         <div className="text-[10px] text-gray-500 uppercase">Real World Price</div>
                         <div className="text-lg font-bold text-[#97ce4c]">¥{market.finalPrice || '??'}</div>
                     </div>
                 </div>
             </div>
         )}

         <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Temporal Variance</h3>
                <div className="flex gap-1 bg-[#0d1117] rounded p-1">
                    {['1H', '6H', '1D', 'ALL'].map(r => (
                        <button key={r} onClick={() => setTimeRange(r as TimeRange)} className={`px-3 py-1 text-[10px] rounded font-bold transition-colors ${timeRange === r ? 'bg-[#30363d] text-[#97ce4c]' : 'text-gray-600 hover:text-gray-400'}`}>{r}</button>
                    ))}
                </div>
            </div>
            <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                      <XAxis dataKey="time" stroke="#334155" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis domain={['auto', 'auto']} hide /> {/* FIX: Auto scale for visibility */}
                      <Tooltip 
                        formatter={(value: number) => isFogMode ? '???' : `${Math.round(value * 100)}%`} 
                        contentStyle={{backgroundColor: '#0d1117', border: '1px solid #97ce4c', fontFamily: 'monospace', color: '#97ce4c'}} 
                        itemStyle={{fontSize: '12px'}} 
                      />
                      {market.outcomes.map((o, i) => (
                          <Line key={o.id} connectNulls type="monotone" dataKey={o.name} stroke={['#97ce4c', '#42b4ca', '#f0e14a', '#ef4444'][i%4]} dot={false} strokeWidth={2} isAnimationActive={false} />
                      ))}
                  </LineChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div>
                 <div className="flex justify-between mb-2">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">市场概率分布 <InfoTooltip text="各选项的当前概率（百分比）" /></h3>
             </div>
             {!isFogMode && <SentimentBar outcomes={market.outcomes} userPositions={userPositions} />}
             {isFogMode && <div className="w-full h-3 bg-[#0d1117] rounded-full border border-[#30363d] mb-6 flex items-center justify-center text-[10px] text-gray-600 font-mono">DATA CORRUPTED // FOG DETECTED</div>}
             
             <div className="space-y-2">
                {market.outcomes.map((o, i) => (
                    <div key={o.id} className="transition-all duration-300">
                        <div 
                             onClick={() => setSelectedOutcomeId(o.id)}
                             className={`group relative p-4 rounded-lg border cursor-pointer flex items-center justify-between overflow-hidden transition-all ${selectedOutcomeId === o.id ? 'bg-[#97ce4c]/10 border-[#97ce4c] shadow-[0_0_10px_rgba(151,206,76,0.1)]' : 'bg-[#0d1117] border-[#30363d] hover:border-[#97ce4c]/50'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: ['#97ce4c', '#42b4ca', '#f0e14a', '#ef4444'][i%4]}}></div>
                                <span className="font-bold text-gray-200 font-mono">{o.name}</span>
                                <span className="text-gray-500 text-xs">{o.description}</span>
                                {market.winningOutcomeId === o.id && <CheckCircle2 className="text-[#97ce4c] w-4 h-4 ml-2" />}
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`font-bold font-mono ${selectedOutcomeId === o.id ? 'text-[#97ce4c]' : 'text-gray-400'}`}>
                                    {displayProb(o.price)}
                                </span>
                            </div>
                        </div>
                        {selectedOutcomeId === o.id && (
                             <OrderBookVisual transactions={transactions.filter(t => t.outcomeId === o.id)} outcomeName={o.name} />
                        )}
                    </div>
                ))}
             </div>
         </div>

      </div>

      <div className="lg:col-span-4 relative z-10">
        {selectedOutcome ? (
         <div className="sticky top-20 bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden shadow-2xl hover:shadow-[0_0_20px_rgba(66,180,202,0.1)] transition-shadow">
             <div className="p-4 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
                 <div className="flex bg-[#161b22] rounded p-1 border border-[#30363d]">
                     <button onClick={() => setTab('BUY')} className={`px-4 py-1 text-xs font-bold rounded uppercase transition-colors ${tab==='BUY' ? 'bg-[#97ce4c] text-black' : 'text-gray-500 hover:text-white'}`}>买入</button>
                     <button onClick={() => setTab('SELL')} className={`px-4 py-1 text-xs font-bold rounded uppercase transition-colors ${tab==='SELL' ? 'bg-[#ef4444] text-black' : 'text-gray-500 hover:text-white'}`}>卖出</button>
                 </div>
                 <span className="text-xs text-gray-500 font-mono">Bal: {user?.balance.toFixed(0)}</span>
             </div>

             <div className="p-5 space-y-6">
                 {isLocked && <div className="bg-[#ef4444]/20 border border-[#ef4444] p-2 text-center text-[#ef4444] font-bold text-xs mb-4 animate-pulse">⚠️ 市场已锁定，无法交易 ⚠️</div>}
                 
                 <div className="flex items-center justify-between">
                     <span className="text-sm font-bold text-white font-mono">{selectedOutcome.name}</span>
                     <span className="text-2xl font-bold text-[#42b4ca] font-mono">{isFogMode ? '??E' : `${selectedOutcome.price.toFixed(3)}E`}</span>
                 </div>

                 <div className="mt-4">
                     <div className="relative">
                         <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-3 pl-3 pr-12 text-white text-lg font-mono focus:border-[#42b4ca] focus:shadow-[0_0_10px_rgba(66,180,202,0.2)] outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="0"
                            disabled={isLocked}
                         />
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                             <span className="text-gray-500 text-xs font-bold">{tab === 'BUY' ? '能量' : '份额'}</span>
                             <InfoTooltip text={tab==='BUY' ? "你想投入多少能量（E）" : "你想卖出多少份额"} />
                         </div>
                     </div>
                 </div>

                 <div className="space-y-2 py-4 border-t border-[#30363d] border-dashed">
                     <div className="flex justify-between text-xs font-mono">
                         <span className="text-gray-500">执行价格 <InfoTooltip text="实际成交价格（考虑滑点影响）" /></span>
                         <span className="text-gray-300">{isFogMode ? '???' : `${executionPrice.toFixed(3)}E`}</span>
                     </div>
                     <div className="flex justify-between text-xs font-mono">
                         <span className="text-gray-500 flex items-center">{tab === 'BUY' ? '预计获得' : '预计收回'} <InfoTooltip text={tab === 'BUY' ? "预计能获得多少份额" : "预计能收回多少能量"} /></span>
                         <span className="text-gray-300">{isFogMode ? '???' : (tab === 'BUY' ? estShares.toFixed(2) + ' 份额' : formatCurrency(inputVal * executionPrice) + ' E')}</span>
                     </div>
                 </div>

                 <button 
                    disabled={isButtonDisabled}
                    onClick={handleTrade}
                    className={`w-full py-3 rounded font-bold text-black shadow-lg uppercase tracking-widest text-sm transition-all disabled:opacity-50 disabled:grayscale ${
                        isButtonDisabled ? 'bg-gray-700 cursor-not-allowed text-gray-400' :
                        (tab === 'BUY' ? 'bg-[#97ce4c] hover:bg-[#b2df28] shadow-[0_0_15px_rgba(151,206,76,0.3)]' : 'bg-[#ef4444] hover:bg-[#ff5555] shadow-[0_0_15px_rgba(239,68,68,0.3)]')
                    }`}
                 >
                     {isTrading ? <Loader2 className="animate-spin mx-auto" /> : buttonText}
                 </button>
             </div>
         </div>
        ) : (
            <div className="p-8 border border-dashed border-[#30363d] rounded-xl text-center text-gray-600 text-sm">
                请先选择一个选项
            </div>
        )}
      </div>
    </div>
  );
};

// ... Portfolio Component (Unchanged) ...
const TransactionHistory = () => {
  const { user } = useContext(AuthContext);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProfit, setTotalProfit] = useState(0);
  
  useEffect(() => {
    if (user) {
      (async () => {
        try {
          const allMarkets = await api.getMarkets();
          // 使用新方法获取用户的所有交易（包括管理员操作和结算收益）
          const allTxs = await api.getUserAllTransactions(user.id);
          const sortedTxs = allTxs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          setMarkets(allMarkets);
          setTransactions(sortedTxs);
          
          // Calculate total profit/loss
          // For BUY: amount = money spent, shares = quantity bought
          // For SELL: amount = quantity sold, shares = money received
          // For SETTLEMENT: amount = reward received
          // For ADMIN_ADD: amount = points added by admin
          let profit = 0;
          sortedTxs.forEach(tx => {
            if (tx.type === 'BUY') {
              profit -= tx.amount; // Spent money
            } else if (tx.type === 'SELL') {
              profit += tx.shares; // Received money (shares field for SELL)
            } else if (tx.type === 'SETTLEMENT') {
              profit += tx.amount; // Settlement reward received
            } else if (tx.type === 'ADMIN_ADD') {
              profit += tx.amount; // Admin added points
            }
          });
          setTotalProfit(profit);
          setLoading(false);
        } catch (e) {
          console.error('Failed to load transaction history:', e);
          setLoading(false);
        }
      })();
    }
  }, [user]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#97ce4c]" /></div>;

  const enrichedTransactions = transactions.map(tx => {
    const market = tx.marketId ? markets.find(m => m.id === tx.marketId) : null;
    const outcome = market && tx.outcomeId ? market.outcomes.find(o => o.id === tx.outcomeId) : null;
    return {
      ...tx,
      marketQuestion: market?.question || (tx.type === 'ADMIN_ADD' ? '管理员操作' : 'Unknown Market'),
      outcomeName: outcome?.name || (tx.type === 'ADMIN_ADD' ? '-' : '?'),
      marketStatus: market?.status || 'UNKNOWN'
    };
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-white mb-6 font-mono uppercase tracking-widest flex items-center gap-2">
        <Activity className="text-[#97ce4c]" /> 积分明细
      </h1>

      {/* Summary Card */}
      <div className="bg-[#161b22] rounded-xl overflow-hidden border border-[#30363d] mb-6">
        <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">总交易数</div>
            <div className="text-2xl font-bold text-white font-mono">{transactions.length}</div>
          </div>
          <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">买入次数</div>
            <div className="text-2xl font-bold text-[#97ce4c] font-mono">
              {transactions.filter(t => t.type === 'BUY').length}
            </div>
          </div>
          <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d]">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">卖出次数</div>
            <div className="text-2xl font-bold text-[#ef4444] font-mono">
              {transactions.filter(t => t.type === 'SELL').length}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-[#30363d] bg-[#0d1117]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 uppercase tracking-widest">净盈亏</span>
            <span className={`text-3xl font-bold font-mono ${totalProfit >= 0 ? 'text-[#97ce4c]' : 'text-[#ef4444]'}`}>
              {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)} E
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            注：此计算基于交易金额，不包括持仓未实现盈亏
          </p>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-[#161b22] rounded-xl overflow-hidden border border-[#30363d]">
        {enrichedTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-mono text-sm">暂无交易记录</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-sm">
              <thead className="bg-[#0d1117] text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-4 w-24">时间</th>
                  <th className="p-4">市场</th>
                  <th className="p-4">选项</th>
                  <th className="p-4 text-right w-20">类型</th>
                  <th className="p-4 text-right">数量</th>
                  <th className="p-4 text-right">价格</th>
                  <th className="p-4 text-right">金额</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {enrichedTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-[#30363d]/30 transition-colors">
                    <td className="p-4 text-gray-400 text-xs w-24">
                      {new Date(tx.timestamp).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-300 line-clamp-1 max-w-xs">{tx.marketQuestion}</div>
                    </td>
                    <td className="p-4 text-[#97ce4c]">{tx.outcomeName}</td>
                    <td className="p-4 text-right w-20">
                      <span className={`px-2 py-1 rounded text-xs font-bold inline-block ${
                        tx.type === 'BUY' 
                          ? 'bg-[#97ce4c]/20 text-[#97ce4c] border border-[#97ce4c]/30' 
                          : tx.type === 'SELL'
                          ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
                          : tx.type === 'SETTLEMENT'
                          ? 'bg-[#f0e14a]/20 text-[#f0e14a] border border-[#f0e14a]/30'
                          : 'bg-[#42b4ca]/20 text-[#42b4ca] border border-[#42b4ca]/30'
                      }`}>
                        {tx.type === 'BUY' ? '买入' : tx.type === 'SELL' ? '卖出' : tx.type === 'SETTLEMENT' ? '结算' : '管理员'}
                      </span>
                    </td>
                    <td className="p-4 text-right text-gray-400">
                      {tx.type === 'BUY' ? formatCurrency(tx.shares) : 
                       tx.type === 'SELL' ? formatCurrency(tx.amount) : 
                       tx.type === 'SETTLEMENT' ? formatCurrency(tx.shares) : '-'}
                    </td>
                    <td className="p-4 text-right text-gray-400">
                      {tx.type === 'ADMIN_ADD' ? '-' : formatProb(tx.price)}
                    </td>
                    <td className={`p-4 text-right font-bold ${
                      tx.type === 'BUY' ? 'text-[#ef4444]' : 
                      tx.type === 'SELL' || tx.type === 'SETTLEMENT' || tx.type === 'ADMIN_ADD' ? 'text-[#97ce4c]' : 'text-gray-400'
                    }`}>
                      {tx.type === 'BUY' ? '-' : '+'}
                      {tx.type === 'BUY' ? formatCurrency(tx.amount) : 
                       tx.type === 'SELL' ? formatCurrency(tx.shares) : 
                       formatCurrency(tx.amount)} E
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const Portfolio = () => {
  const { user } = useContext(AuthContext);
  const [positions, setPositions] = useState<Position[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
     if (user) {
         Promise.all([api.getUserPositions(user.id), api.getMarkets()]).then(([p, m]) => {
             setPositions(p); setMarkets(m); setLoading(false);
         }).catch(console.error);
     }
  }, [user]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-[#97ce4c]" /></div>;

  const enrichedPositions = positions.map(p => {
      const market = markets.find(m => m.id === p.marketId);
      const outcome = market?.outcomes.find(o => o.id === p.outcomeId);
      const currentValue = p.shares * (outcome?.price || 0);
      return { ...p, marketQuestion: market?.question || 'Unknown', outcomeName: outcome?.name || '?', currentPrice: outcome?.price || 0, currentValue, profit: currentValue - (p.shares * p.avgPrice) };
  });

  return (
      <div className="max-w-5xl mx-auto px-4 py-8">
          <h1 className="text-xl font-bold text-white mb-6 font-mono uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="text-[#97ce4c]" /> Active Entanglements
          </h1>
          <div className="bg-[#161b22] rounded-xl overflow-hidden border border-[#30363d]">
              {enrichedPositions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 font-mono text-sm">No active quantum states found.</div>
              ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-sm">
                        <thead className="bg-[#0d1117] text-xs uppercase text-gray-500">
                            <tr>
                                <th className="p-4">Nexus Event</th>
                                <th className="p-4 text-right">Shares</th>
                                <th className="p-4 text-right">Valuation <InfoTooltip text="Current Market Value" /></th>
                                <th className="p-4 text-right">Delta <InfoTooltip text="Profit / Loss" /></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#30363d]">
                            {enrichedPositions.map(p => (
                                <tr key={p.id} className="hover:bg-[#30363d]/30 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-300 line-clamp-1">{p.marketQuestion}</div>
                                        <div className="text-xs text-[#97ce4c] mt-1">{'>>'} Timeline {p.outcomeName}</div>
                                    </td>
                                    <td className="p-4 text-right text-gray-400">{p.shares.toFixed(2)}</td>
                                    <td className="p-4 text-right text-white">{formatCurrency(p.currentValue)}</td> 
                                    <td className={`p-4 text-right font-bold ${p.profit >= 0 ? 'text-[#97ce4c]' : 'text-[#ef4444]'}`}>
                                        {p.profit >= 0 ? '+' : ''}{formatCurrency(p.profit)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
              )}
          </div>
      </div>
  );
};

const AdminPanel = () => {
    const { systemConfig, setSystemNotification, setSystemEventMode, user, refreshUser, logout } = useContext(AuthContext);
    
    // Safety check for non-admins trying to access this component
    if (!user || !user.isAdmin) {
        return (
            <div className="p-8 text-center border border-red-500 bg-red-900/10 rounded-xl m-8">
                <ShieldAlert className="mx-auto h-12 w-12 text-red-500 mb-4 animate-pulse" />
                <h2 className="text-xl font-bold text-red-500 mb-2">ACCESS DENIED</h2>
                <p className="text-gray-400 font-mono text-sm">Gatekeeper privileges required. This incident will be reported.</p>
            </div>
        );
    }

    const [msg, setMsg] = useState('');
    const [mode, setMode] = useState(systemConfig.eventMode);
    
    // Loading States for individual buttons
    const [processing, setProcessing] = useState<string | null>(null);

    // Logs for Admin Console
    const [logs, setLogs] = useState<string[]>([]);
    const addLog = (text: string) => {
        const timestamp = new Date().toLocaleTimeString('en-US', {hour12: false});
        setLogs(prev => [`[${timestamp}] ${text}`, ...prev.slice(0, 49)]); // Keep last 50 logs
    };

    // Data Loading
    const [markets, setMarkets] = useState<Market[]>([]);
    useEffect(() => { api.getMarkets().then(setMarkets); }, [processing]); // Refresh when processing done

    // Create Market State
    const [q, setQ] = useState('');
    const [desc, setDesc] = useState('');
    // 4 Distinct Outcome Inputs
    const [outcomeA, setOutcomeA] = useState('');
    const [outcomeB, setOutcomeB] = useState('');
    const [outcomeC, setOutcomeC] = useState('');
    const [outcomeD, setOutcomeD] = useState('');
    const [end, setEnd] = useState('');

    // Settle State
    const [settleId, setSettleId] = useState('');
    const [winId, setWinId] = useState('');
    const [finalP, setFinalP] = useState('1.0');
    
    // Delete State
    const [deleteId, setDeleteId] = useState('');
    const [deleteConfirmation, setDeleteConfirmation] = useState(false); // New explicit confirmation state

    // Daily Operations Confirmation States
    const [confirmTax, setConfirmTax] = useState(false);
    const [confirmAirdrop, setConfirmAirdrop] = useState(false);

    // Points State
    const [targetUsername, setTargetUsername] = useState('');
    const [points, setPoints] = useState('');
    
    // Identity Reset
    const [resetUsername, setResetUsername] = useState('');
    const [resetBalance, setResetBalance] = useState<string>('');  // 可选：重置后的余额

    useEffect(() => { setMode(systemConfig.eventMode); }, [systemConfig]);

    const handleUpdateNotify = () => { 
        setSystemNotification(msg); 
        addLog(`System Notification updated: "${msg}"`);
    };
    const handleSetMode = (m: any) => { 
        setSystemEventMode(m); 
        setMode(m); 
        addLog(`System Reality Distortion Mode changed to: ${m}`);
    };

    const handleCreateMarket = async () => {
        // Join 4 outcomes
        const outcomesStr = [outcomeA, outcomeB, outcomeC, outcomeD].filter(s => s.trim()).join(',');
        if (!outcomesStr) { alert("Please enter outcomes"); return; }
        
        setProcessing('CREATE');
        addLog(`> Initiating new Nexus Event: "${q.substring(0, 20)}..."`);
        try { 
            await api.createMarket(q, desc, outcomesStr, end); 
            addLog("> SUCCESS: Market Created successfully.");
            setQ(''); setDesc(''); setOutcomeA(''); setOutcomeB(''); setOutcomeC(''); setOutcomeD('');
        }
        catch(e:any) { 
            addLog(`> ERROR: Failed to create market. ${e.message}`);
        }
        finally { setProcessing(null); }
    };
    
    const handleToggleLock = async (m: Market) => {
        // Toggle manually between OPEN and LOCKED
        const newStatus = m.status === MarketStatus.LOCKED ? MarketStatus.OPEN : MarketStatus.LOCKED;
        
        setProcessing(`LOCK_${m.id}`);
        addLog(`> Modifying temporal lock for ${m.id} to ${newStatus}...`);
        try {
            await api.updateMarketStatus(m.id, newStatus);
            setProcessing(null);
            addLog(`> SUCCESS: Market is now ${newStatus}.`);
        } catch(e:any) {
            addLog(`> ERROR: Lock toggle failed. ${e.message}`);
            setProcessing(null);
        }
    };

    const handleSettle = async () => {
        if (!settleId || !winId) { addLog("⚠ ABORT: Missing settle parameters."); return; }
        setProcessing('SETTLE');
        addLog(`> COLLAPSING TIMELINE ${settleId} with Winner ${winId}...`);
        try { 
            await api.settleMarket(settleId, winId, parseFloat(finalP)); 
            addLog(`> SUCCESS: Timeline collapsed. Payouts distributed.`);
            // 刷新用户数据以显示更新的余额
            await refreshUser();
            // 延迟刷新市场列表，确保状态更新
            setTimeout(() => {
                api.getMarkets().then(setMarkets).catch(console.error);
            }, 300);
        }
        catch(e:any) { 
            console.error("Settle Error:", e);
            addLog(`> CRITICAL ERROR: Settlement failed. ${e.message}`);
        }
        finally { setProcessing(null); }
    };
    
    const handleDelete = async () => {
        if (!deleteId) {
            addLog("⚠ ABORT: No market selected for deletion.");
            return;
        }
        
        // REPLACED window.confirm with internal UI state check
        // The checking happens in the button UI logic below

        setProcessing('DELETE');
        addLog(`> INITIATING DELETION PROTOCOL for Market ${deleteId}...`);
        addLog(`> Accessing database records...`);
        
        try {
            await api.deleteMarket(deleteId);
            addLog(`> SUCCESS: Market ${deleteId} and all history erased.`);
            setDeleteId('');
            setDeleteConfirmation(false);
        } catch(e:any) { 
            console.error("Delete Error:", e);
            addLog(`> CRITICAL FAILURE: ${e.message}`);
            addLog(`> SUGGESTION: If this is a permission error, check Supabase RLS policies.`);
        }
        finally { setProcessing(null); }
    }
    
    const handleAddPoints = async () => {
        setProcessing('POINTS');
        addLog(`> Transferring ${points}E to ${targetUsername}...`);
        try { 
            await api.addPoints(targetUsername, parseFloat(points)); 
            addLog(`> SUCCESS: Energy transfer complete.`);
            if (targetUsername === user?.username) await refreshUser(); 
        }
        catch(e:any) { addLog(`> ERROR: Transfer failed. ${e.message}`); }
        finally { setProcessing(null); }
    };
    
    const handleTax = async () => {
        if(mode === 'B') return; 
        setProcessing('TAX');
        addLog(`> Triggering global entropy tax...`);
        try { 
            await api.triggerDailyCost(); 
            addLog(`> SUCCESS: Taxes collected from all active users.`);
            await refreshUser(); // FIX: Update local user state immediately
        }
        catch(e:any) { addLog(`> ERROR: Tax collection failed. ${e.message}`); }
        finally { 
            setProcessing(null); 
            setConfirmTax(false); // Reset confirmation state
        }
    };
    
    const handleAirdrop = async () => {
        setProcessing('AIRDROP');
        addLog(`> Initiating Airdrop Protocol (500E)...`);
        try { 
            const count = await api.airdropPointsToActiveUsers(500); 
            addLog(`> SUCCESS: Airdropped 500E to ${count} active users.`); 
            await refreshUser(); // FIX: Update local user state immediately in case admin got it
        }
        catch(e:any) { addLog(`> ERROR: Airdrop failed. ${e.message}`); }
        finally { 
            setProcessing(null); 
            setConfirmAirdrop(false); // Reset confirmation state
        }
    };
    
    const handleResetIdentity = async () => {
        if (!resetUsername.trim()) {
            addLog(`> ERROR: Username is required.`);
            return;
        }
        
        setProcessing('RESET');
        addLog(`> Resetting identity for ${resetUsername}...`);
        try { 
            // 如果提供了余额，则重置余额；否则只重置 role
            const newBalance = resetBalance.trim() ? parseFloat(resetBalance) : undefined;
            await api.resetUserRoleByUsername(resetUsername, newBalance); 
            
            // 如果重置的是当前登录用户，强制登出
            if (resetUsername === user?.username) {
                addLog(`> User ${resetUsername} was logged out. They must re-login and select role.`);
                // 延迟一下再登出，让日志先显示
                setTimeout(async () => {
                    await logout();
                }, 500);
            } else {
                addLog(`> SUCCESS: Identity wiped for ${resetUsername}. User will be logged out and must re-select role on next login.`);
            }
            
            setResetUsername('');
            setResetBalance('');
        }
        catch(e:any) { addLog(`> ERROR: Reset failed. ${e.message}`); }
        finally { setProcessing(null); }
    };
    
    const handleResetMe = async () => {
        addLog(`> Resetting SELF identity...`);
        try { 
            await api.resetMyRole(); 
            await refreshUser(); 
            addLog(`> SUCCESS. Refresh page recommended.`);
        }
        catch(e:any) { addLog(`> ERROR: ${e.message}`); }
    };
    
    // Helpers for Settle Dropdown
    const selectedMarketForSettle = markets.find(m => m.id === settleId);

    return (
        <div className="max-w-4xl mx-auto p-6 font-mono space-y-8">
            <h1 className="text-2xl font-bold text-[#ef4444] uppercase tracking-widest border-b border-[#ef4444]/30 pb-4">Gatekeeper Console</h1>
            
            {/* 1. Event Control */}
            <div className="bg-[#161b22] p-6 rounded-xl border border-[#ef4444]/30">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Activity className="text-[#ef4444]" /> Reality Distortion Field</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {[
                        {id: 'NONE', label: 'NORMAL', icon: <Target size={16}/>},
                        {id: 'A', label: 'TURBULENCE', icon: <Activity size={16}/>},
                        {id: 'B', label: 'ENTROPY 0', icon: <Ban size={16}/>},
                        {id: 'C', label: 'AIRDROP', icon: <CloudRain size={16}/>},
                        {id: 'D', label: 'FOG', icon: <Eye size={16}/>},
                    ].map((opt) => (
                        <button 
                            key={opt.id}
                            onClick={() => handleSetMode(opt.id)}
                            className={`p-3 rounded border flex flex-col items-center gap-2 transition-all ${mode === opt.id ? 'bg-[#ef4444] text-black border-[#ef4444] shadow-[0_0_10px_red]' : 'bg-[#0d1117] text-gray-500 border-[#30363d] hover:border-[#ef4444]'}`}
                        >
                            {opt.icon}
                            <span className="text-[10px] font-bold">{opt.label}</span>
                        </button>
                    ))}
                </div>
                <div className="mt-4 text-xs text-gray-500 border-t border-[#30363d] pt-2">
                    {mode === 'A' && "EFFECT: Volatility x2, Visual Glitches"}
                    {mode === 'B' && "EFFECT: Tax Holiday (Daily Cost Disabled)"}
                    {mode === 'C' && "EFFECT: Enable Airdrop Button below (Event is Action-based)"}
                    {mode === 'D' && "EFFECT: Hide Prices & Probabilities"}
                    {mode === 'NONE' && "System Nominal"}
                </div>
            </div>

            {/* 2. Operations */}
            <div className="grid md:grid-cols-2 gap-6">
                 {/* Broadcast */}
                <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d]">
                    <h3 className="text-sm font-bold text-white mb-4">System Broadcast</h3>
                    <div className="flex gap-2">
                        <input className="flex-1 bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs outline-none" placeholder="Message..." value={msg} onChange={e=>setMsg(e.target.value)} />
                        <button onClick={handleUpdateNotify} className="bg-[#42b4ca]/20 text-[#42b4ca] px-4 rounded text-xs font-bold hover:bg-[#42b4ca] hover:text-black">SEND</button>
                    </div>
                </div>
                
                 {/* Daily Actions */}
                <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d] flex flex-col gap-2">
                    <h3 className="text-sm font-bold text-white mb-2">Daily Operations</h3>
                    
                    {/* TAX BUTTON */}
                    {mode === 'B' ? (
                        <button disabled className="w-full py-2 rounded text-xs font-bold uppercase flex justify-center items-center gap-2 bg-green-900/30 text-green-500 border border-green-500/50 cursor-not-allowed">
                            TAX HOLIDAY ACTIVE
                        </button>
                    ) : (
                        !confirmTax ? (
                            <button 
                                onClick={() => setConfirmTax(true)}
                                className="w-full py-2 rounded text-xs font-bold uppercase flex justify-center items-center gap-2 bg-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444] hover:text-black border border-[#ef4444]"
                            >
                                TRIGGER ENTROPY TAX
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleTax}
                                    disabled={processing === 'TAX'}
                                    className="flex-1 py-2 rounded text-xs font-bold uppercase flex justify-center items-center gap-2 bg-red-600 text-white border border-red-500 animate-pulse hover:bg-red-700"
                                >
                                    {processing === 'TAX' && <Loader2 className="animate-spin" size={14}/>}
                                    CONFIRM TAX
                                </button>
                                <button 
                                    onClick={() => setConfirmTax(false)}
                                    className="px-4 py-2 rounded text-xs font-bold uppercase bg-[#30363d] text-gray-300 border border-gray-600 hover:bg-gray-700"
                                >
                                    CANCEL
                                </button>
                            </div>
                        )
                    )}

                    {/* AIRDROP BUTTON */}
                    {mode === 'C' && (
                        !confirmAirdrop ? (
                            <button 
                                onClick={() => setConfirmAirdrop(true)}
                                className="w-full py-2 rounded text-xs font-bold uppercase bg-[#f0e14a]/20 text-[#f0e14a] border border-[#f0e14a] hover:bg-[#f0e14a] hover:text-black flex justify-center items-center gap-2"
                            >
                                DEPLOY AIRDROP (500E)
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleAirdrop}
                                    disabled={processing === 'AIRDROP'}
                                    className="flex-1 py-2 rounded text-xs font-bold uppercase flex justify-center items-center gap-2 bg-[#f0e14a] text-black border border-[#f0e14a] animate-pulse hover:bg-[#d4c53c]"
                                >
                                    {processing === 'AIRDROP' && <Loader2 className="animate-spin" size={14}/>}
                                    CONFIRM DROP
                                </button>
                                <button 
                                    onClick={() => setConfirmAirdrop(false)}
                                    className="px-4 py-2 rounded text-xs font-bold uppercase bg-[#30363d] text-gray-300 border border-gray-600 hover:bg-gray-700"
                                >
                                    CANCEL
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* 3. Market Mgmt */}
            <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d]">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-[#30363d] pb-2">Create Nexus Event</h3>
                <div className="grid gap-4">
                    <input className="bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs" placeholder="Question" value={q} onChange={e=>setQ(e.target.value)} />
                    <textarea className="bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs h-24 resize-none" placeholder="Description (Supports multiline)" value={desc} onChange={e=>setDesc(e.target.value)} />
                    
                    <div className="grid grid-cols-2 gap-2">
                        <input className="bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs" placeholder="Outcome A" value={outcomeA} onChange={e=>setOutcomeA(e.target.value)} />
                        <input className="bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs" placeholder="Outcome B" value={outcomeB} onChange={e=>setOutcomeB(e.target.value)} />
                        <input className="bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs" placeholder="Outcome C" value={outcomeC} onChange={e=>setOutcomeC(e.target.value)} />
                        <input className="bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs" placeholder="Outcome D" value={outcomeD} onChange={e=>setOutcomeD(e.target.value)} />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <input className="bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs" type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} />
                        <p className="text-[10px] text-gray-500">Note: This Date is purely for display. Use "Manual Lock" below to stop trading.</p>
                    </div>
                    <button onClick={handleCreateMarket} disabled={processing==='CREATE'} className="bg-[#97ce4c] text-black font-bold py-2 rounded text-xs hover:bg-[#b2df28] flex justify-center items-center gap-2">
                        {processing === 'CREATE' && <Loader2 className="animate-spin" size={14}/>}
                        INITIATE EVENT
                    </button>
                    
                    {/* Manual Lock List */}
                    <div className="mt-4 pt-4 border-t border-[#30363d]">
                        <h4 className="text-xs text-gray-500 font-bold mb-2">Manual Event Override (Force Lock)</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {markets.map(m => (
                                <div key={m.id} className="flex justify-between items-center bg-[#0d1117] p-2 rounded border border-[#30363d]">
                                    <span className="text-[10px] text-gray-300 truncate w-32">{m.question}</span>
                                    <button 
                                        onClick={() => handleToggleLock(m)} 
                                        disabled={processing===`LOCK_${m.id}`}
                                        className={`text-[9px] px-2 py-1 rounded font-bold flex items-center gap-1 ${m.status==='LOCKED' ? 'bg-[#ef4444] text-black' : 'bg-green-900 text-green-500'}`}
                                    >
                                        {processing===`LOCK_${m.id}` && <Loader2 size={8} className="animate-spin"/>}
                                        {m.status==='LOCKED' ? <Lock size={10}/> : <Unlock size={10}/>}
                                        {m.status==='LOCKED' ? 'LOCKED' : 'OPEN'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d]">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-[#30363d] pb-2">Collapse Timeline (Settle)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                     <select 
                        className="bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs outline-none"
                        value={settleId}
                        onChange={e => { setSettleId(e.target.value); setWinId(''); }}
                     >
                         <option value="">Select Market...</option>
                         {markets.filter(m => m.status !== 'RESOLVED').map(m => (
                             <option key={m.id} value={m.id}>{m.question}</option>
                         ))}
                     </select>
                     
                     <select
                        className="bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs outline-none"
                        value={winId}
                        onChange={e => setWinId(e.target.value)}
                        disabled={!settleId}
                     >
                        <option value="">Select Winner...</option>
                        {selectedMarketForSettle?.outcomes.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                     </select>

                     <input className="bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs" placeholder="Final Price (1.0)" value={finalP} onChange={e=>setFinalP(e.target.value)} />
                </div>
                <button onClick={handleSettle} disabled={processing==='SETTLE'} className="mt-4 w-full bg-[#ef4444] text-black font-bold py-2 rounded text-xs hover:bg-[#ff5555] flex justify-center items-center gap-2">
                    {processing === 'SETTLE' && <Loader2 className="animate-spin" size={14}/>}
                    EXECUTE COLLAPSE
                </button>
            </div>
            
            <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d]">
                <h3 className="text-lg font-bold text-white mb-4 border-b border-[#30363d] pb-2">Erase Timeline (Delete)</h3>
                <div className="flex gap-2">
                     <select 
                        className="flex-1 bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs outline-none"
                        value={deleteId}
                        onChange={e => { setDeleteId(e.target.value); setDeleteConfirmation(false); }}
                     >
                         <option value="">Select Market to Delete...</option>
                         {markets.map(m => (
                             <option key={m.id} value={m.id}>[{m.status}] {m.question}</option>
                         ))}
                     </select>
                     
                     {!deleteConfirmation ? (
                        <button 
                            onClick={() => {
                                if(!deleteId) { addLog("⚠ Select a market first."); return; }
                                setDeleteConfirmation(true);
                            }} 
                            disabled={processing==='DELETE'} 
                            className="bg-red-900/40 border border-red-500 text-red-500 px-4 rounded text-xs font-bold hover:bg-red-900 hover:text-white flex justify-center items-center gap-2"
                        >
                            DELETE
                        </button>
                     ) : (
                         <>
                            <button 
                                onClick={handleDelete} 
                                disabled={processing==='DELETE'} 
                                className="bg-red-600 border border-red-500 text-white px-4 rounded text-xs font-bold hover:bg-red-700 flex justify-center items-center gap-2 animate-pulse"
                            >
                                {processing === 'DELETE' && <Loader2 className="animate-spin" size={14}/>}
                                CONFIRM ERASE
                            </button>
                            <button 
                                onClick={() => setDeleteConfirmation(false)} 
                                className="bg-[#30363d] border border-gray-600 text-gray-300 px-4 rounded text-xs font-bold hover:bg-gray-700"
                            >
                                CANCEL
                            </button>
                         </>
                     )}
                </div>
            </div>
            
            <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d]">
                 <h3 className="text-lg font-bold text-white mb-4 border-b border-[#30363d] pb-2">Divine Intervention (Add Points)</h3>
                 <div className="flex gap-2">
                     <input className="flex-1 bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs" placeholder="Username" value={targetUsername} onChange={e=>setTargetUsername(e.target.value)} />
                     <input className="w-24 bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs" placeholder="Points" value={points} onChange={e=>setPoints(e.target.value)} />
                     <button onClick={handleAddPoints} disabled={processing==='POINTS'} className="bg-[#42b4ca] text-black font-bold px-4 rounded text-xs flex justify-center items-center gap-2">
                         {processing === 'POINTS' && <Loader2 className="animate-spin" size={14}/>}
                         GRANT
                     </button>
                 </div>
            </div>

            <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d]">
                 <h3 className="text-lg font-bold text-white mb-4 border-b border-[#30363d] pb-2">Identity Re-Initialization</h3>
                 <div className="space-y-2">
                     <input 
                         className="w-full bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs" 
                         placeholder="Username" 
                         value={resetUsername} 
                         onChange={e => setResetUsername(e.target.value)} 
                     />
                     <input 
                         className="w-full bg-[#0d1117] border border-[#30363d] p-2 rounded text-white text-xs" 
                         placeholder="New Balance (optional, leave empty to keep current balance)" 
                         type="number"
                         value={resetBalance} 
                         onChange={e => setResetBalance(e.target.value)} 
                     />
                     <p className="text-[10px] text-gray-500">
                         💡 留空余额 = 只重置角色（不清除积分）<br/>
                         💡 填写余额 = 重置角色 + 设置新余额（用于破产用户重新开始）
                     </p>
                     <button 
                         onClick={handleResetIdentity} 
                         disabled={processing==='RESET' || !resetUsername.trim()} 
                         className="w-full bg-orange-500/20 border border-orange-500 text-orange-500 px-4 py-2 rounded text-xs font-bold hover:bg-orange-500 hover:text-black flex justify-center items-center gap-2"
                     >
                         {processing === 'RESET' && <Loader2 className="animate-spin" size={14}/>}
                         RESET IDENTITY
                     </button>
                 </div>
                 <p className="text-[10px] text-gray-500 mt-2">Note: This clears the user's role and all sessions (forces logout). User must re-login and select a role. Transaction history and positions remain intact.</p>
            </div>

             {/* System Console Logs */}
             <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d] font-mono text-[10px] h-48 overflow-y-auto">
                 <div className="flex items-center gap-2 mb-2 text-gray-500 border-b border-[#30363d] pb-1">
                     <Terminal size={12} />
                     <span className="font-bold">SYSTEM TERMINAL OUTPUT</span>
                 </div>
                 {logs.length === 0 && <div className="text-gray-700 italic">Ready for input...</div>}
                 {logs.map((log, i) => (
                     <div key={i} className={`mb-1 ${log.includes('ERROR') || log.includes('FAILURE') ? 'text-red-400' : 'text-[#97ce4c]'}`}>
                         {log}
                     </div>
                 ))}
             </div>
            
             <div className="bg-[#161b22] p-6 rounded-xl border border-[#30363d] opacity-50 hover:opacity-100 transition-opacity">
                 <h3 className="text-xs font-bold text-gray-500 mb-2">DEBUG ZONE</h3>
                 <button onClick={handleResetMe} className="text-xs text-[#ef4444] border border-[#ef4444] px-3 py-1 rounded hover:bg-[#ef4444] hover:text-black">RESET MY IDENTITY</button>
             </div>
        </div>
    );
};

// ... App Root ...
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('home');
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [showCoreRules, setShowCoreRules] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // System Config State (Mocked local state for demo, ideally also in DB)
  const [sysConfig, setSysConfig] = useState<{ notification: string, eventMode: 'NONE' | 'A' | 'B' | 'C' | 'D' }>({ 
      notification: '', 
      eventMode: 'NONE' 
  });

  const initAuth = useCallback(async () => {
    try {
        const u = await api.getCurrentUser();
        setUser(u);
        const hasRead = localStorage.getItem('universe_intro_read');
        if (!hasRead) setShowIntro(true);
    } catch (e: any) { 
        console.error(e); 
        setAuthError(e.message || "Connection Failed");
    } finally { 
        setLoading(false); 
    }
  }, []);

  useEffect(() => { initAuth(); }, [initAuth]);

  const handleIntroComplete = () => {
      localStorage.setItem('universe_intro_read', 'true');
      setShowIntro(false);
      setShowCoreRules(true);
  };

  const handleCoreRulesComplete = () => {
      setShowCoreRules(false);
  };

  const register = async (username: string, password: string) => { 
      try {
        setAuthError(null);
        await api.register(username, password); 
      } catch (e: any) {
        setAuthError(e.message);
        throw e;
      }
  };

  const login = async (username: string, password: string) => { 
      try {
        setAuthError(null);
        await api.login(username, password); 
      } catch (e: any) {
        setAuthError(e.message);
        throw e;
      }
  };

  const logout = async () => { await api.logout(); setUser(null); setPage('home'); };
  const refreshUser = async () => { 
    const u = await api.getCurrentUser(); 
    setUser(u);
    // Analytics: 记录登录时间
    if (u) {
      try {
        await (api as any).logUserLogin?.(u.id);
      } catch (e) {
        console.warn('Analytics tracking failed:', e);
      }
    }
  };
  const handleSelectRole = async (role: 'INTERN' | 'FULL_TIME') => { 
    try {
      const u = await api.selectRole(role); 
      setUser(u); 
    } catch (e: any) {
      console.error('Failed to select role:', e);
      alert(`选择身份失败: ${e.message}`);
    }
  };
  
  const handleNavigate = (p: string) => { setPage(p); if (p === 'home') setSelectedMarketId(null); };

  if (loading) return <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-[#97ce4c]"><Loader2 className="animate-spin h-8 w-8" /></div>;

  if (showIntro) return <IntroOverlay onComplete={handleIntroComplete} />;
  if (showCoreRules) return <CoreRulesOverlay onComplete={handleCoreRulesComplete} />;

  const contextValue = { 
      user, loading, register, login, logout, refreshUser, setUser, 
      systemConfig: sysConfig, 
      setSystemNotification: (m: string) => setSysConfig(p=>({...p, notification: m})), 
      setSystemEventMode: (m: 'NONE'|'A'|'B'|'C'|'D') => setSysConfig(p=>({...p, eventMode: m})),
      authError 
  };

  if (!user) return (
    <AuthContext.Provider value={contextValue}>
        <Login />
    </AuthContext.Provider>
  );

  if (!user.role) return (
       <AuthContext.Provider value={contextValue}>
            <RoleModal onSelect={handleSelectRole} />
       </AuthContext.Provider>
  );

  return (
    <AuthContext.Provider value={contextValue}>
      <div className={`min-h-screen bg-[#0d1117] text-slate-200 pb-20 font-mono selection:bg-[#97ce4c] selection:text-black ${sysConfig.eventMode === 'A' ? 'glitch-text' : ''}`}>
        <Navbar onNavigate={handleNavigate} />
        
        {page === 'home' && !selectedMarketId && (
            <MarketList onSelectMarket={(id) => { setSelectedMarketId(id); setPage('detail'); }} />
        )}

        {page === 'detail' && selectedMarketId && (
            <MarketDetail marketId={selectedMarketId} onBack={() => { setSelectedMarketId(null); setPage('home'); }} />
        )}

        {page === 'portfolio' && <Portfolio />}
        {page === 'history' && <TransactionHistory />}
        {page === 'admin' && <AdminPanel />}

      </div>
    </AuthContext.Provider>
  );
};

export default App;
