import { db, products, priceHistory, notifications } from "./index.js";
import "dotenv/config";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // 기존 데이터 삭제 (개발환경에서만)
    if (process.env.NODE_ENV === "development") {
      await db.delete(notifications);
      await db.delete(priceHistory);
      await db.delete(products);
      console.log("🗑️  Cleared existing data");
    }

    // 샘플 상품 데이터 생성
    const sampleProducts = await db
      .insert(products)
      .values([
        {
          name: "삼성 갤럭시 S24 Ultra 256GB",
          storeUrl: "https://smartstore.naver.com/sample-product-1",
          targetPrice: "1200000",
          currentPrice: "1350000",
          isActive: true,
        },
        {
          name: "LG 그램 노트북 17인치",
          storeUrl: "https://smartstore.naver.com/sample-product-2",
          targetPrice: "1800000",
          currentPrice: "1950000",
          isActive: true,
        },
        {
          name: "아이폰 15 Pro 128GB",
          storeUrl: "https://smartstore.naver.com/sample-product-3",
          targetPrice: "1400000",
          isActive: true,
        },
        {
          name: "에어팟 프로 2세대",
          storeUrl: "https://smartstore.naver.com/sample-product-4",
          targetPrice: "250000",
          currentPrice: "289000",
          isActive: false, // 비활성 상품 예시
        },
      ])
      .returning();

    console.log(`✅ Created ${sampleProducts.length} sample products`);

    // 가격 히스토리 데이터 생성
    const priceHistoryData = [];
    for (const product of sampleProducts.slice(0, 2)) {
      // 처음 2개 상품만
      const basePrice = parseInt(product.currentPrice || "0");

      // 최근 7일간의 가격 변동 기록 생성
      for (let i = 7; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const priceVariation = Math.floor(Math.random() * 100000) - 50000; // ±50,000원 변동
        const price = Math.max(basePrice + priceVariation, basePrice * 0.8); // 최소 80% 가격 유지

        priceHistoryData.push({
          productId: product.id,
          price: price.toString(),
          isAvailable: Math.random() > 0.1, // 90% 확률로 구매 가능
          checkedAt: date,
        });
      }
    }

    await db.insert(priceHistory).values(priceHistoryData);
    console.log(`✅ Created ${priceHistoryData.length} price history records`);

    // 알림 데이터 생성
    const notificationData = [
      {
        productId: sampleProducts[0].id,
        type: "price_drop",
        title: "가격 하락 알림",
        message: `${sampleProducts[0].name}의 가격이 목표가 이하로 떨어졌습니다!`,
        isRead: false,
      },
      {
        productId: sampleProducts[1].id,
        type: "target_reached",
        title: "목표가 달성",
        message: `${sampleProducts[1].name}이 목표가에 도달했습니다.`,
        isRead: true,
      },
    ];

    await db.insert(notifications).values(notificationData);
    console.log(`✅ Created ${notificationData.length} notifications`);

    console.log("🎉 Database seed completed successfully!");
  } catch (error) {
    console.error("❌ Database seed failed:", error);
    throw error;
  }
}

// 스크립트 실행
if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seed };
