const Item = require('../models/Item.model');

const seedData = async () => {
  try {
    const count = await Item.countDocuments();
    if (count === 0) {
      const items = [
        {
          name: 'เอสแดง',
          category: 'equipment',
          totalQuantity: 2,
          availableQuantity: 2,
          unit: 'เครื่อง',
          description: 'หุ่นจำลองระบบทางเดินหายใจ (ปอดจำลองเอสแดง) สำหรับการเรียนการสอนสรีรวิทยา',
          location: 'ตู้เก็บของห้องปฏิบัติการชั้น 2',
          status: 'active',
        },
        {
          name: 'คีย์บอร์ดไร้สาย Logi',
          category: 'device',
          totalQuantity: 5,
          availableQuantity: 5,
          unit: 'ชิ้น',
          description: 'Wireless Keyboard for IT staff and developers',
          location: 'ตู้ IT ชั้น 3',
          status: 'active',
        },
        {
          name: 'หนังสือ React 19 ใน 24 ชั่วโมง',
          category: 'book',
          totalQuantity: 3,
          availableQuantity: 3,
          unit: 'เล่ม',
          description: 'หนังสือสอนการเขียน React 19 ตั้งแต่พื้นฐานจนถึงขั้นสูง',
          location: 'ห้องสมุดชั้น 1',
          status: 'active',
        },
        {
          name: 'หูฟังตัดเสียงรบกวน Sony',
          category: 'device',
          totalQuantity: 4,
          availableQuantity: 4,
          unit: 'เครื่อง',
          description: 'Sony Noise Cancelling Headphones for deep work',
          location: 'ห้อง IT ชั้น 3',
          status: 'active',
        },
      ];
      await Item.insertMany(items);
      console.log('✅ Base items seeded successfully (including เอสแดง 2 ตัว)');
    }
  } catch (error) {
    console.error('❌ Seeding Error:', error.message);
  }
};

module.exports = seedData;
