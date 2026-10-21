import {
  House,
  Compass,
  Calendar,
  Medal,
  DataLine,
  Star,
  ChatDotRound,
  Bell,
  User,
  Odometer,
  Shop,
  UserFilled,
  Tickets,
  List,
  CircleCheck,
  DataAnalysis,
  ChatLineSquare,
  TrendCharts,
  OfficeBuilding,
  DocumentChecked,
  Grid,
  SetUp,
  PieChart
} from '@element-plus/icons-vue';

export const roleMeta = {
  user: { label: '会员端', short: 'MEMBER', accent: '#bde35a' },
  provider: { label: '服务商端', short: 'PARTNER', accent: '#6fe0c1' },
  admin: { label: '平台管理端', short: 'PLATFORM', accent: '#f1c96b' }
};

export const menus = {
  user: [
    { path: '/user/home', label: '首页概览', icon: House },
    { path: '/user/venues', label: '场馆服务', icon: Compass },
    { path: '/user/appointments', label: '我的预约', icon: Calendar },
    { path: '/user/checkins', label: '健身打卡', icon: Medal },
    { path: '/user/body-tests', label: '体测数据', icon: DataLine },
    { path: '/user/favorites', label: '我的收藏', icon: Star },
    { path: '/user/reviews', label: '我的评价', icon: ChatDotRound },
    { path: '/user/notifications', label: '消息通知', icon: Bell }
  ],
  provider: [
    { path: '/provider/dashboard', label: '经营概览', icon: Odometer },
    { path: '/provider/store', label: '门店信息', icon: Shop },
    { path: '/provider/coaches', label: '教练管理', icon: UserFilled },
    { path: '/provider/services', label: '服务管理', icon: Tickets },
    { path: '/provider/orders', label: '预约订单', icon: List },
    { path: '/provider/checkins', label: '打卡核验', icon: CircleCheck },
    { path: '/provider/body-tests', label: '学员体测', icon: DataAnalysis },
    { path: '/provider/reviews', label: '评价管理', icon: ChatLineSquare },
    { path: '/provider/stats', label: '营业数据', icon: TrendCharts }
  ],
  admin: [
    { path: '/admin/dashboard', label: '平台概览', icon: Odometer },
    { path: '/admin/providers', label: '服务商入驻', icon: OfficeBuilding },
    { path: '/admin/users', label: '用户账号', icon: User },
    { path: '/admin/orders', label: '订单监管', icon: DocumentChecked },
    { path: '/admin/categories', label: '服务分类', icon: Grid },
    { path: '/admin/checkin-rules', label: '打卡规则', icon: SetUp },
    { path: '/admin/reviews', label: '评价审核', icon: ChatDotRound },
    { path: '/admin/stats', label: '平台数据', icon: PieChart }
  ]
};
