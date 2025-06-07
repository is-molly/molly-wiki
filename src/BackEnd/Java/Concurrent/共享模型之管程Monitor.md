---
order: 3
date: 2024-04-06
---
# 共享模型之管程Monitor

## 共享问题

### 引入故事举例

- 老王(操作系统)有一个功能强大的算盘(CPU)，现在想把它租出去，赚一点外快
- 小南、小女(线程)来使用这个算盘来进行一些计算，并按照时间给老王支付费用 
- 但小南不能一天24小时使用算盘，他经常要小憩一会(sleep)，又或是去吃饭上厕所(阻塞 io 操作)，有时还需要一根烟，没烟时思路全无(wait)这些情况统称为(阻塞)
- 在这些时候，算盘没利用起来(不能收钱了)，老王觉得有点不划算
- 另外，小女也想用用算盘，如果总是小南占着算盘，让小女觉得不公平
- 于是，老王灵机一动，想了个办法 [ 让他们每人用一会，轮流使用算盘 ] 
- 这样，当小南阻塞的时候，算盘可以分给小女使用，不会浪费，反之亦然
- 最近执行的计算比较复杂，需要存储一些中间结果，而学生们的脑容量(工作内存)不够，所以老王申请了 一个笔记本(主存)，把一些中间结果先记在本上
- 计算流程是这样的：

![](images/计算流程1.png)

- 但是由于分时系统，有一天还是发生了事故
- 小南刚读取了初始值 0 做了个 +1 运算，还没来得及写回结果
- 老王说 [ 小南，你的时间到了，该别人了，记住结果走吧 ]，于是小南念叨着 [ 结果是1，结果是1...] 不甘心地 到一边待着去了(上下文切换)
- 老王说 [ 小女，该你了 ]，小女看到了笔记本上还写着 0 做了一个 -1 运算，将结果 -1 写入笔记本
- 这时小女的时间也用完了，老王又叫醒了小南：[小南，把你上次的题目算完吧]，小南将他脑海中的结果 1 写 入了笔记本

![](images/计算流程2.png)

- 小南和小女都觉得自己没做错，但笔记本里的结果是 1 而不是 0

### Java中的体现

两个线程对初始值为 0 的静态变量一个做自增，一个做自减，各做 5000 次，结果是 0 吗?

```java
static int counter = 0;

public static void main(String[] args) throws InterruptedException { 			
    Thread t1 = new Thread(() -> {
		for (int i = 0; i < 5000; i++) { 
      counter++;
		}
	}, "t1");
	Thread t2 = new Thread(() -> {
		for (int i = 0; i < 5000; i++) {
			counter--; 
    }
	}, "t2");
    t1.start();
	t2.start();
	t1.join();
	t2.join();
    log.debug("{}",counter);
}
```

分析：以上的结果可能是正数、负数、零。为什么呢?因为 Java 中对静态变量的自增，自减并不是原子操作，要彻底理解，必须从字节码来进行分析

例如对于 i++ 而言(i 为静态变量)，实际会产生如下的 JVM 字节码指令:

```java
getstatic  i 	// 获取静态变量i的值
iconst_1 			// 准备常量1
iadd 					// 自增
putstatic  i  // 将修改后的值存入静态变量i
```

而对应 i-- 也是类似:

```java
getstatic  i 	// 获取静态变量i的值
iconst_1 			// 准备常量1
isub 					// 自减
putstatic  i  // 将修改后的值存入静态变量i
```

而 Java 的内存模型如下，完成静态变量的自增，自减需要在主存和工作内存中进行数据交换:

![](images/Java内存模型.png)

如果是单线程以上 8 行代码是顺序执行(不会交错)没有问题:

```mermaid
sequenceDiagram
	  participant 线程1
    participant static i
    static i->>线程1:getstatic i 读取 0
    线程1->>线程1:iconst_1 准备常数 1
    线程1->>线程1:iadd加法，线程内 i = 1
    线程1->>static i:putstatic i 写入 1
    static i->>线程1:getstatic i 读取 1
    线程1->>线程1:iconst_1 准备常数 1
    线程1->>线程1:isub减法，线程内 i = 0
    线程1->>static i:putstatic i 写入 0
```

但多线程下这 8 行代码可能交错运行:

- 出现负数的情况：

```mermaid
sequenceDiagram
	  participant 线程1
	  participant 线程2
    participant static i
    static i->>线程2:getstatic i 读取 0
    线程2->>线程2:iconst_1 准备常数 1
    线程2->>线程2:isub减法，线程内 i = -1
    线程2-->>线程1:上下文切换
    static i->>线程1:getstatic i 读取 0
    线程1->>线程1:iconst_1 准备常数 1
    线程1->>线程1:iadd加法，线程内 i = 1
    线程1->>static i:putstatic i 写入 1
    线程1-->>线程2:上下文切换
    线程2->>static i:putstatic i 写入 -1
```

- 出现正数的情况：

```mermaid
sequenceDiagram
	  participant 线程1
	  participant 线程2
    participant static i
    static i->>线程1:getstatic i 读取 0
    线程1->>线程1:iconst_1 准备常数 1
    线程1->>线程1:iadd加法，线程内 i = 1
    线程1-->>线程2:上下文切换
    static i->>线程2:getstatic i 读取 0
    线程2->>线程2:iconst_1 准备常数 1
    线程2->>线程2:isub减法，线程内 i = -1
    线程2->>static i:putstatic i 写入 -1
    线程2-->>线程1:上下文切换
    线程1->>static i:putstatic i 写入 1
```

**临界区 Critical Section**

- 一个程序运行多个线程本身是没有问题的
- 问题出在多个线程访问**共享资源**
  - 多个线程读**共享资源**其实也没有问题
  - 在多个线程对**共享资源**读写操作时发生指令交错，就会出现问题
- 一段代码块内如果存在对**共享资源**的多线程读写操作，称这段代码块为**临界区**

例如，下面代码中的临界区

```java
static int counter = 0;

static void increment() 
// 临界区
{
	counter++; 
}

static void decrement() 
// 临界区
{
	counter--; 
}
```

**竞态条件 Race Condition**

多个线程在临界区内执行，由于代码的**执行序列不同**而导致结果无法预测，称之为发生了**竞态条件**

## synchronized 解决方案

### synchronized应用之互斥

为了避免临界区的竞态条件发生，有多种手段可以达到目的。

- 阻塞式的解决方案：synchronized，Lock
- 非阻塞式的解决方案：原子变量

这里使用阻塞式的解决方案：synchronized来解决上述问题，即俗称的 `对象锁`，它采用互斥的方式让同一时刻至多只有一个线程能持有 `对象锁`，其它线程再想获取这个 `对象锁` 时就会阻塞住。这样就能保证拥有锁 的线程可以安全的执行临界区内的代码，不用担心线程上下文切换。

> 注意：虽然 java 中互斥和同步都可以采用 synchronized 关键字来完成，但它们还是有区别的
>
> - 互斥是保证临界区的竞态条件发生，同一时刻只能有一个线程执行临界区代码
> - 同步是由于线程执行的先后、顺序不同、需要一个线程等待其它线程运行到某个点

### synchronized实现互斥用法

```java
synchronized(对象) // 线程1， 线程2(blocked) 
{
	//临界区
}
```

#### 实例

```java
static int counter = 0;
static final Object room = new Object();

public static void main(String[] args) throws InterruptedException { 			Thread t1 = new Thread(() -> {
		for (int i = 0; i < 5000; i++) { 
      synchronized (room) {
				counter++; 
    	}
		}
	}, "t1");
	Thread t2 = new Thread(() -> {
		for (int i = 0; i < 5000; i++) {
			synchronized (room) { 
        counter--;
			} 
    }
  }, "t2");
	t1.start();
	t2.start();
	t1.join();
	t2.join();                                                                    	log.debug("{}",counter);
}
```

我们可以这样类比：

- `synchronized(对象)` 中的对象，可以想象为一个房间(room)，有唯一入口(门)房间只能一次进入一人 进行计算，线程 t1，t2 想象成两个人
- 当线程 t1 执行到 `synchronized(room)` 时就好比 t1 进入了这个房间，并锁住了门拿走了钥匙，在门内执行count++ 代码
- 这时候如果 t2 也运行到了 synchronized(room) 时，它发现门被锁住了，只能在门外等待，发生了上下文切换，阻塞住了
- 这中间即使 t1 的 cpu 时间片不幸用完，被踢出了门外(不要错误理解为锁住了对象就能一直执行下去哦)， 这时门还是锁住的，t1 仍拿着钥匙，t2 线程还在阻塞状态进不来，只有下次轮到 t1 自己再次获得时间片时才能开门进入
- 当 t1 执行完 `synchronized{}` 块内的代码，这时候才会从 obj 房间出来并解开门上的锁，唤醒 t2 线程把钥匙给他。t2 线程这时才可以进入 obj 房间，锁住了门拿上钥匙，执行它的 `count--` 代码

时序图理解如下：

```mermaid
sequenceDiagram
	  participant t1 as 线程1
	  participant t2 as 线程2
    participant i as static i
    participant l as 锁对象
    t2 ->> l:尝试获取锁
    Note over t2,l:拥有锁
    i ->> t2:getstatic i 读取 0
    t2 ->> t2:iconst_1 准备常数 1
    t2 ->> t2:isub减法，线程内 i = -1
    t2 -->> t1:上下文切换
    t1 -x l:尝试获取锁，被阻塞(BLOCKED)
    t1 -->> t2:上下文切换
    t2 ->> i:putstatic i 写入 -1
    Note over t2,l:拥有锁
    t2 ->> l:释放锁，并唤醒阻塞的线程
    Note over t1,l:拥有锁
    i ->> t1:getstatic i 读取 -1
    t1 ->> t1:iconst_1 准备常数 1
    t1 ->> t1:iadd加法，线程内 i = 1
    t1 ->> i:putstatic i 写入 0
    Note over t1,l:拥有锁
    t1 ->> l:释放锁，并唤醒阻塞的线程
```

#### 思考

synchronized 实际是用 `对象锁` 保证了 `临界区内代码的原子性`，临界区内的代码对外是不可分割的，不会被线程切 换所打断。

为了加深理解，请思考下面的问题：

- 如果把 `synchronized(obj) `放在 for 循环的外面，如何理解? --  强调原子性
- 如果 t1 `synchronized(obj1)` 而 t2 `synchronized(obj2)` 会怎样运作? -- 强调锁对象
- 如果 t1 `synchronized(obj) `而 t2 没有加会怎么样?如何理解? -- 强调锁对象

### 面向对象改进

把需要保护的共享变量放入一个类

```java
class Room {
	int value = 0;
	
  public void increment() { 
    synchronized (this) {
			value++; 
    }
	}
  
	public void decrement() { 
    synchronized (this) {
			value--; 
    }
	}
  
	public int get() { 
    synchronized (this) {
			return value; 
    }
	} 
}

@Slf4j
public class Test1 {
	public static void main(String[] args) throws InterruptedException { 			Room room = new Room();
		Thread t1 = new Thread(() -> {
      for (int j = 0; j < 5000; j++) { 
        room.increment();
      }
		}, "t1");
		Thread t2 = new Thread(() -> {
			for (int j = 0; j < 5000; j++) {
				room.decrement();
      }
		}, "t2");                                                                    	 	 t1.start();                                                                       		 t2.start();
    t1.join();
    t2.join();
    log.debug("count: {}" , room.get());
	} 
}
```

### 方法上的synchronized

```java
class Test{
	public synchronized void test() {
	
  } 
}

//等价于
class Test{
	public void test() {
		synchronized(this) {}
	} 
}
```

```java
class Test{
	public synchronized static void test() {
	
  } 
}

//等价于
class Test{
	public static void test() {
		synchronized(Test.class) {}	
	} 
}
```

### 练习题之线程八锁

其实就是考察 synchronized 锁住的是哪个对象

情况1：12 或 21，有互斥效果

```java
@Slf4j(topic = "c.Number") 
class Number{
	public synchronized void a() { 
    log.debug("1");
	}

  public synchronized void b() {
		log.debug("2"); }
	}
}

public static void main(String[] args) { 
  Number n1 = new Number();
  new Thread(()->{ n1.a(); }).start(); 
  new Thread(()->{ n1.b(); }).start();
}
```

情况2：一秒后1 2，或 2 一秒后 1，有互斥效果

```java
@Slf4j(topic = "c.Number") 
class Number{
	public synchronized void a() { 
    sleep(1);
		log.debug("1"); 
  }

  public synchronized void b() { 
    log.debug("2");
	} 
}

public static void main(String[] args) { 
  Number n1 = new Number();
  new Thread(()->{ n1.a(); }).start(); 
  new Thread(()->{ n1.b(); }).start();
}
```

情况3：3 一秒后 1 2 或 2 3 一秒后 1 或 3 2 一秒后 1，a和b有互斥效果，c和ab无互斥

```java
@Slf4j(topic = "c.Number")
class Number{
	public synchronized void a() {
		sleep(1);
		log.debug("1"); 
  }

  public synchronized void b() { 
    log.debug("2");
	}
  
	public void c() {
		log.debug("3"); 
  }
}

public static void main(String[] args) { 
  Number n1 = new Number();
	new Thread(()->{ n1.a(); }).start(); 
  new Thread(()->{ n1.b(); }).start(); 
  new Thread(()->{ n1.c(); }).start();
}
```

情况4：2 一秒后 1，无互斥效果

```java
@Slf4j(topic = "c.Number")
class Number{
	public synchronized void a() { 
    sleep(1);
		log.debug("1"); 
  }

  public synchronized void b() { 
    log.debug("2");
	} 
}

public static void main(String[] args) { 
  Number n1 = new Number();
	Number n2 = new Number();
	new Thread(()->{ n1.a(); }).start(); 
  new Thread(()->{ n2.b(); }).start();
}
```

情况5：2 一秒后 1，无互斥效果

```java
@Slf4j(topic = "c.Number") 
class Number{
	public static synchronized void a() { 
    sleep(1);
		log.debug("1"); 
  }

  public synchronized void b() { 
    log.debug("2");
	}
}

public static void main(String[] args) { 
  Number n1 = new Number();
	new Thread(()->{ n1.a(); }).start(); 
  new Thread(()->{ n1.b(); }).start();
}
```

情况6：一秒后1 2， 或 2 一秒后 1，有互斥效果

```java
@Slf4j(topic = "c.Number") 
class Number{
	public static synchronized void a() { 
    sleep(1);
		log.debug("1"); 
  }

  public static synchronized void b() { 
    log.debug("2");
	} 
}

public static void main(String[] args) { 
  Number n1 = new Number();
	new Thread(()->{ n1.a(); }).start(); 
  new Thread(()->{ n1.b(); }).start();
}
```

情况7：2 一秒后 1，无互斥效果

```java
@Slf4j(topic = "c.Number") 
class Number{
	public static synchronized void a() { 
    sleep(1);
		log.debug("1"); 
  }

  public synchronized void b() { 
    log.debug("2");
	} 
}

public static void main(String[] args) { 
  Number n1 = new Number();
	Number n2 = new Number();
	new Thread(()->{ n1.a(); }).start(); 
  new Thread(()->{ n2.b(); }).start();
}
```

情况8：一秒后1 2， 或 2 一秒后 1，无互斥效果

```java
@Slf4j(topic = "c.Number")
class Number{
	public static synchronized void a() {
		sleep(1);
		log.debug("1"); 
  }

  public static synchronized void b() { 
    log.debug("2");
	} 
}

public static void main(String[] args) { 
  Number n1 = new Number();
	Number n2 = new Number();
	new Thread(()->{ n1.a(); }).start(); 
  new Thread(()->{ n2.b(); }).start();
}
```

## 变量的线程安全分析 

**成员变量和静态变量是否线程安全?**

- 如果它们没有共享，则线程安全
- 如果它们被共享了，根据它们的状态是否能够改变，又分两种情况
  - 如果只有读操作，则线程安全
  - 如果有读写操作，则这段代码是临界区，需要考虑线程安全

**局部变量是否线程安全?**

- 局部变量是线程安全的
- 但局部变量引用的对象则未必
  - 如果该对象没有逃离方法的作用访问，它是线程安全的
  - 如果该对象逃离方法的作用范围，需要考虑线程安全

**局部变量线程安全分析**

```java
public static void test1() { 
  int i = 10;
	i++; 
}
```

每个线程调用 test1() 方法时局部变量 i，会在每个线程的栈帧内存中被创建多份，因此不存在共享

```java
public static void test1(); 
	descriptor: ()V
  flags: ACC_PUBLIC, ACC_STATIC 
  Code:
		stack=1, locals=1, args_size=0
			0: bipush     10
      2: istore_0 
      3: iinc       0,1
			6: return
		LineNumberTable: 
			line 10: 0 
      line 11: 3 
      line 12: 6
		LocalVariableTable:
			Start Length Slot Name Signature
			    3     4    0    i    I
```

如图:

![](images/线程安全分析1.png)

但是局部变量的引用稍有不同，先看一个成员变量的例子：

```java
class ThreadUnsafe {
	ArrayList<String> list = new ArrayList<>(); 
  public void method1(int loopNumber) {
		for (int i = 0; i < loopNumber; i++) { 
      // { 临界区, 会产生竞态条件 
      method2();
			
      method3();
  		// } 临界区 
    }
	}
  
	private void method2() { 
    list.add("1");
	}	

  private void method3() { 
    list.remove(0);
	}
}
```

执行:

```java
static final int THREAD_NUMBER = 2; 
static final int LOOP_NUMBER = 200; 

public static void main(String[] args) {
	ThreadUnsafe test = new ThreadUnsafe(); 
	for (int i = 0; i < THREAD_NUMBER; i++) {
		new Thread(() -> { 
			test.method1(LOOP_NUMBER);
		}, "Thread" + i).start(); 
	}
}
```

其中一种情况是，如果线程2 还未 add，线程1 remove 就会报错：

```shell
Exception in thread "Thread1" java.lang.IndexOutOfBoundsException: Index: 0, Size: 0 
		at java.util.ArrayList.rangeCheck(ArrayList.java:657)
		at java.util.ArrayList.remove(ArrayList.java:496)
		at cn.itcast.n6.ThreadUnsafe.method3(TestThreadSafe.java:35)
		at cn.itcast.n6.ThreadUnsafe.method1(TestThreadSafe.java:26)
		at cn.itcast.n6.TestThreadSafe.lambda$main$0(TestThreadSafe.java:14) 		 at java.lang.Thread.run(Thread.java:748)
```

分析:

- 无论哪个线程中的 method2 引用的都是同一个对象中的 list 成员变量 
- method3 与 method2 分析相同

![](images/线程安全分析2.png)

将 list 修改为局部变量，那么就不会有上述问题了

```java
class ThreadSafe {
	public final void method1(int loopNumber) {
		ArrayList<String> list = new ArrayList<>(); 
    for (int i = 0; i < loopNumber; i++) {
			method2(list);
			method3(list); 
    }
	}

  private void method2(ArrayList<String> list) { 
    list.add("1");
	}

  private void method3(ArrayList<String> list) { 
    list.remove(0);
	} 
}
```

分析:

- list 是局部变量，每个线程调用时会创建其不同实例，没有共享
- 而 method2 的参数是从 method1 中传递过来的，与 method1 中引用同一个对象 
- method3 的参数分析与 method2 相同	 	

![](images/线程安全分析3.png)

- 情况1：有其它线程调用 method2 和 method3，也不会有线程安全问题
- 情况2：在 情况1 的基础上，为 ThreadSafe 类添加子类，子类覆盖 method2 或 method3 方法，<span style="color:red">存在线程安全问题</span>！即

```java
class ThreadSafe {
	public final void method1(int loopNumber) {
		ArrayList<String> list = new ArrayList<>(); 
    for (int i = 0; i < loopNumber; i++) {
			method2(list);
			method3(list); }
		}

  private void method2(ArrayList<String> list) {
		list.add("1");
 	}

  private void method3(ArrayList<String> list) { 
    list.remove(0);
	} 
}

class ThreadSafeSubClass extends ThreadSafe{ 
  @Override
	public void method3(ArrayList<String> list) { 
    new Thread(() -> {
			list.remove(0); 
    }).start();
	} 
}
```

> 从这个例子可以看出 private 或 final 提供 `安全` 的意义所在，请体会开闭原则中的 `闭`

## 常用线程安全类

- String
- Integer
- StringBuffer
- Random
- Vector
- Hashtable java.util.concurrent 包下的类

这里说它们是线程安全的是指，多个线程调用它们同一个实例的某个方法时，是线程安全的。也可以理解为

```java
Hashtable table = new Hashtable();

new Thread(()->{ 
  table.put("key", "value1");
}).start();

new Thread(()->{ 
  table.put("key", "value2");
}).start();
```

它们的每个方法是原子的，但注意它们多个方法的组合不是原子的，见后面分析

## 线程安全类方法的组合

分析下面的代码是否线程安全？

```java
Hashtable table = new Hashtable(); 
// 线程1，线程2
if( table.get("key") == null) {
	table.put("key", value); 
}
```

```mermaid
sequenceDiagram
	  participant t1 as 线程1
	  participant t2 as 线程2
	  participant a2 as table
	  
	  t1 ->> a2:get("key") == null
	  t2 ->> a2:get("key") == null
	  t2 ->> a2:put("key",v2)
	  t1 ->> a2:put("key",v1)
```

## 不可变类线程安全性

String、Integer 等都是不可变类，因为其内部的状态不可以改变，因此它们的方法都是线程安全的

你也许有疑问，String 有 replace，substring 等方法【可以】改变值啊，那么这些方法又是如何保证线程安全的呢?  ==> String的”改变值“其实是创建了新的对象，并未修改原有对象。原理如下：

```java
public class Immutable{ 
  private int value = 0;

  public Immutable(int value){ 
    this.value = value;
	}

  public int getValue(){ 
    return this.value;
	}
  
	public Immutable add(int v){
		return new Immutable(this.value + v);
	} 
}
```

## 实例分析

### 例一

```java
/**
 * servlet运行在tomcat中，默认只有一个实例，会被tomcat的多个线程共享使用
 */
public class MyServlet extends HttpServlet { 
  // 是否安全? 否
	Map<String,Object> map = new HashMap<>(); 
  
  // 是否安全? 是
	String S1 = "...";
  
	// 是否安全? 是
	final String S2 = "..."; 
  
  // 是否安全? 否
	Date D1 = new Date();
  
	// 是否安全? 否，final只是指D2的引用值固定了不能变，但这个引用值内部属性是可变的
	final Date D2 = new Date();
  
	public void doGet(HttpServletRequest request, HttpServletResponse response) {
  		// 使用上述变量
  }
}
```

### 例二

```java
/**
 *  因为servlet是单实例的，所以userService也只有一份被多个线程共享使用
 */
public class MyServlet extends HttpServlet { 
  // 是否安全? 否
	private UserService userService = new UserServiceImpl();

  public void doGet(HttpServletRequest request, HttpServletResponse response) { 
    userService.update(...);
	} 
}

public class UserServiceImpl implements UserService { 
  // 记录调用次数
	private int count = 0;
	public void update() { 
    // ...
		count++; 
  }
}
```

### 例三

```java
/**
 * spring中的bean如果没有额外声明则都是单例的，即MyAspect对象是单例的
 */
@Aspect
@Component
public class MyAspect {
	// 是否安全? 否
  // 如何解决？=> 
  //    - 可以把该对象做成多例来解决吗？否，因为进入前置通知和后置通知可能不属于       	//                              一个对象，时间统计就不一致了
  // 		- 可以使用环绕通知，将成员变量都改为局部变量
	private long start = 0L;

  @Before("execution(* *(..))") 
  public void before() {
		start = System.nanoTime(); 
  }
  
	@After("execution(* *(..))") 
  public void after() {
		long end = System.nanoTime();
		System.out.println("cost time:" + (end-start)); 
  }
}
```

### 例四

```java
/**
 * servlet默认单实例
 */
public class MyServlet extends HttpServlet { 
  // 是否安全? 是，因为引用的对象的成员变量是私有的不可变
	private UserService userService = new UserServiceImpl();

  public void doGet(HttpServletRequest request, HttpServletResponse response) { 
    userService.update(...);
	}
}

public class UserServiceImpl implements UserService { 
  // 是否安全？是，因为引用的对象中无成员变量
	private UserDao userDao = new UserDaoImpl();
	public void update() { 
    userDao.update();
	} 
}

public class UserDaoImpl implements UserDao { 
  public void update() {
		String sql = "update user set password = ? where username = ?"; 
    // 是否安全？ 是，因为Connection是局部变量
		try (Connection conn = DriverManager.getConnection("","","")){
			// ...
		} catch (Exception e) { 
      // ...
		} 
  }
}
```

### 例五

```java
/**
 * servlet默认单实例
 */
public class MyServlet extends HttpServlet { 
  // 是否安全？否
	private UserService userService = new UserServiceImpl();

  public void doGet(HttpServletRequest request, HttpServletResponse response) { 
    userService.update(...);
	} 
}

public class UserServiceImpl implements UserService { 
  // 是否安全？否
	private UserDao userDao = new UserDaoImpl();
	public void update() { 
    userDao.update();
	} 
}

public class UserDaoImpl implements UserDao { 
  // 是否安全？否
	private Connection conn = null;

  public void update() throws SQLException {
		String sql = "update user set password = ? where username = ?"; 
    conn = DriverManager.getConnection("","","");
		// ...
		conn.close();
	} 
}
```

### 例六

```java
public class MyServlet extends HttpServlet { 
  // 是否安全？是
	private UserService userService = new UserServiceImpl();

  public void doGet(HttpServletRequest request, HttpServletResponse response) { 
    userService.update(...);
	} 
}

public class UserServiceImpl implements UserService { 
  public void update() {
		UserDao userDao = new UserDaoImpl();
		userDao.update(); 
  }
}

public class UserDaoImpl implements UserDao { 
  // 是否安全? 是，前提是一个userDao对象只被一个serServiceImpl对象使用
	private Connection = null;
	public void update() throws SQLException {
		String sql = "update user set password = ? where username = ?"; 
    conn = DriverManager.getConnection("","","");
		// ...
		conn.close();
	} 
}
```

### 例七

```java
public abstract class Test {
	public void bar() { 
    // 是否安全? 否，子类可能是实现foo修改sdf对象
		SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"); 		foo(sdf);
  }

  public abstract foo(SimpleDateFormat sdf);
  
	public static void main(String[] args) { 
    new Test().bar();
	} 
}
```

其中 foo 的行为是不确定的，可能导致不安全的发生，被称之为 `外星方法`

```java
public void foo(SimpleDateFormat sdf) { 
  String dateStr = "1999-10-11 00:00:00"; 
  for (int i = 0; i < 20; i++) {
		new Thread(() -> { 
      try {
				sdf.parse(dateStr);
			} catch (ParseException e) { 
        e.printStackTrace();
			} 
    }).start();
	}
}
```

> 请比较 JDK 中 String 类的实现
>
> ==> 会发现String类被设计为final的，就是为例避免其子类覆盖掉父类中的行为，导致不安全

## 练习题

### 卖票

测试下面代码是否存在线程安全问题，并尝试改正

```java
public class ExerciseSell {
  private static Logger log = LoggerFactory.getLogger(ExerciseSell.class);
  /**
   * 模拟多人买票
   */
	public static void main(String[] args) {
		TicketWindow ticketWindow = new TicketWindow(2000); 
    List<Thread> list = new ArrayList<>();
		// 用来存储买出去多少张票
		List<Integer> sellCount = new Vector<>();
    
    // 启动线程（卖出的票统计）
		for (int i = 0; i < 2000; i++) { 
      Thread t = new Thread(() -> {
        try {
          Thread.sleep(randomAmount());
        } catch (InterruptedException e) {
          e.printStackTrace();
        }
				// 分析这里的竞态条件
				int count = ticketWindow.sell(randomAmount()); 	
        sellCount.add(count);
			}); 
      list.add(t); 
      t.start();
    }	
    
    // 等待买票结束
		list.forEach((t) -> {
			try { 
        t.join();
			} catch (InterruptedException e) { 
        e.printStackTrace();
			} 
    });
    
		// 买出去的票求和
		log.debug("selled count:{}",sellCount.stream().mapToInt(c -> c).sum()); 
    // 剩余票数
		log.debug("remainder count:{}", ticketWindow.getCount());
	}
  
	// Random 是线程安全的
	static Random random = new Random(); 
  
  // 随机 1~5
	public static int randomAmount() {
		return random.nextInt(5) + 1; 
  }
}

class TicketWindow {
	private int count;

  public TicketWindow(int count) {
		this.count = count; 
  }
  
  public int getCount() { 
    return count;
	}

  public int sell(int amount) { 
    if (this.count >= amount) {
			this.count -= amount;
			return amount; 
    } else {
			return 0; 
    }
	} 
}
```

解决：给售票方法加锁

```java
public synchronized int sell(int amount) { 
  if (this.count >= amount) {
    this.count -= amount;
    return amount; 
  } else {
    return 0; 
  }
} 
```

另外，用下面的代码行不行？ => 不行，ArrayList是非线程安全的！

```java
 List<Integer> sellCount = new ArrayList<>();
```

### 转账

测试下面代码是否存在线程安全问题，并尝试改正

```java
public class ExerciseTransfer {
  private static Logger log = LoggerFactory.getLogger(ExerciseTransfer.class);
  
	public static void main(String[] args) throws InterruptedException {
		Account a = new Account(1000); 
    Account b = new Account(1000); 
    Thread t1 = new Thread(() -> {
			for (int i = 0; i < 1000; i++) { 
        a.transfer(b, randomAmount());
			}
		}, "t1");

    Thread t2 = new Thread(() -> {
			for (int i = 0; i < 1000; i++) {
				b.transfer(a, randomAmount()); 
      }
		}, "t2"); 
    
    t1.start();
    t2.start(); 
    t1.join();
		t2.join();
  	// 查看转账2000次后的总金额
		log.debug("total:{}",(a.getMoney() + b.getMoney())); 
  }
  
	// Random 为线程安全
	static Random random = new Random(); // 随机 1~100

  public static int randomAmount() {
		return random.nextInt(100) +1; 
  }
}

class Account {
	private int money;

  public Account(int money) { 
    this.money = money;
	}
  
	public int getMoney() { 
    return money;
	}
  
	public void setMoney(int money) { 
    this.money = money;
	}
  
	public void transfer(Account target, int amount) { 
    if (this.money > amount) {
			this.setMoney(this.getMoney() - amount);
			target.setMoney(target.getMoney() + amount); 
    }
	} 
}
```

解决：给转账方法加锁

> 注意：不能直接使用对象锁，对象锁只对this有效

```java
public void transfer(Account target, int amount) { 
  synchronized (Account.class) {
  	if (this.money > amount) {
    	this.setMoney(this.getMoney() - amount);
    	target.setMoney(target.getMoney() + amount); 
  	}
  }
}
```

这样改行不行? => 不行，非静态方法的synchronized锁是this

```java
public synchronized void transfer(Account target, int amount) { 
  if (this.money > amount) {
		this.setMoney(this.getMoney() - amount);
		target.setMoney(target.getMoney() + amount); 
  }
}
```

## Monitor

### Java对象头

**理解**

Java对象在内存中由两部分组成，对象头、对象中的成员变量

对象头在32位虚拟机中是64位即8个byte，分别为4个byte的Mark work和4个byte的Klass Word

Klass Word是一个指针，指向了这个对象所对应的class类对象，用以确定该对象的类型

**图示**

以32位虚拟机为例：

- 普通对象

<table style="text-align: center;">
  <tbody>
	  <tr>
	  	<td colspan="2">Object Header (64 bits)</td>
	  </tr>
	  <tr>
	  	<td>Mark work (32 bits)</td>
	  	<td>Klass Word (32 bits)</td>
	  </tr>
  </tbody>
</table>



- 数组对象

<table style="text-align: center;">
  <tbody>
    <tr>
      <td colspan="3">Object Header (96 bits)</td>
    </tr>
    <tr>
      <td>Mark work (32 bits)</td>
      <td>Klass Word (32 bits)</td>
      <td>array length（32 bits）</td>
    </tr>
  </tbody>
</table>



> 数组对象的对象头中还有4byte的数组长度

- 其中Mark Word结构为

<table style="text-align: center;">
  <tbody>
    <tr>
      <td colspan="5">Mark Word（32 bits）</td>
      <td>State</td>
    </tr>
    <tr>
      <td colspan="2">hashcode:25</td>
      <td>age:4</td>
      <td>biased_lock:1</td>
      <td>01</td>
      <td>Normal</td>
    </tr>
    <tr>
      <td>thread:23</td>
      <td>epoch:2</td>
      <td>age:4</td>
      <td>biased_lock:1</td>
      <td>01</td>
      <td>Biased</td>
    </tr>
    <tr>
      <td colspan="4">ptr_to_lock_record:30</td>
      <td>00</td>
      <td>Lightweight Locked</td>
    </tr>
    <tr>
      <td colspan="4">ptr_to_heavyweight_monitor:30</td>
      <td>10</td>
      <td>Heavyweight Locked</td>
    </tr>
    <tr>
      <td colspan="4"></td>
      <td>11</td>
      <td>Markedd for GC</td>
    </tr>
  </tbody>
</table>



> 释意：
>
> Normal状态下：
>
> - hashcode：每个对象都有自己的hash码
> - age：垃圾回收时的分代年龄
> - biased_local：是否是偏向锁
> - thread：操作系统层面的线程id
> - epoch：偏向时间戳（偏向计数器），每个类维护一个偏向锁计数器，对其对象进行偏向锁的撤销操作进行计数。当这个值达到指定阈值的时候，jvm就认为这个类的偏向锁有问题，需要进行重偏向（rebias）
> - 01、00、10、11：加锁状态
>
> 其他状态下Mark Word都有不同的占位值
>
> - ptr_to_local_record、ptr_to_heavyweight_monitor：锁记录地址

64位虚拟机的Mark Word结构：

<table style="text-align: center;">
  <tbody>
    <tr>
      <td colspan="6">Mark Word（64 bits）</td>
      <td>State</td>
    </tr>
    <tr>
      <td>unused:25</td>
      <td>hashcode:31</td>
      <td>unused:1</td>
      <td>age:4</td>
      <td>biased_lock:0</td>
      <td>01</td>
      <td>Normal</td>
    </tr>
    <tr>
      <td>thread:54</td>
      <td>epoch:2</td>
      <td>unused:1</td>
      <td>age:4</td>
      <td>biased_lock:1</td>
      <td>01</td>
      <td>Biased</td>
    </tr>
    <tr>
      <td colspan="5">ptr_to_lock_record:62</td>
      <td>00</td>
      <td>Lightweight Locked</td>
    </tr>
    <tr>
      <td colspan="5">ptr_to_heavyweight_monitor:62</td>
      <td>10</td>
      <td>Heavyweight Locked</td>
    </tr>
    <tr>
      <td colspan="5"></td>
      <td>11</td>
      <td>Markedd for GC</td>
    </tr>
  </tbody>
</table>



> 参考资料：https://stackoverflow.com/questions/26357186/what-is-in-java-object-header

### 原理之Monitor(锁)

Monitor：管程，也常被翻译为“监视器”，monitor 不管是翻译为“管程”还是“监视器”，都是比较晦涩的，通过翻译后的中文，并无法对 monitor 达到一个直观的描述。在《操作系统同步原语》 这篇文章中，介绍了操作系统在面对 进程/线程 间同步的时候，所支持的一些同步原语，其中 semaphore 信号量 和 mutex 互斥量是最重要的同步原语。

在使用基本的 mutex 进行并发控制时，需要程序员非常小心地控制 mutex 的 down 和 up 操作，否则很容易引起死锁等问题。为了更容易地编写出正确的并发程序，所以在 mutex 和 semaphore 的基础上，提出了更高层次的同步原语 monitor。

不过需要注意的是，操作系统本身并不支持 monitor 机制，实际上monitor 是属于编程语言的范畴，当你想要使用 monitor 时，先了解一下语言本身是否支持 monitor 原语，例如 C 语言它就不支持 monitor，Java 语言支持 monitor。

一般的 monitor 实现模式是编程语言在语法上提供语法糖，而如何实现 monitor 机制，则属于编译器的工作，Java 就是这么干的。

monitor 的重要特点是，同一个时刻，只有一个 进程/线程 能进入 monitor 中定义的临界区，这使得 monitor 能够达到互斥的效果。但仅仅有互斥的作用是不够的，无法进入 monitor 临界区的 进程/线程，它们应该被阻塞，并且在必要的时候会被唤醒。显然，monitor 作为一个同步工具，也应该提供这样的管理 进程/线程 状态的机制。想想我们为什么觉得 semaphore 和 mutex 在编程上容易出错，因为我们需要去亲自操作变量以及对 进程/线程 进行阻塞和唤醒。monitor 这个机制之所以被称为“更高级的原语”，那么它就不可避免地需要对外屏蔽掉这些机制，并且在内部实现这些机制，使得使用 monitor 的人看到的是一个简洁易用的接口。更多monitor相关内容请自行查阅！

每个 Java 对象都可以关联一个 Monitor 对象，如果使用 synchronized 给对象上锁(重量级)之后，该对象头的Mark Word 中就被设置指向 Monitor 对象的指针

Monitor 结构如下

![](images/Monitor锁.png)

- 刚开始 Monitor 中 Owner 为 null
- 当 Thread-2 执行 synchronized(obj) 就会将 Monitor 的所有者 Owner 置为 Thread-2，Monitor中只能有一 个 Owner
- 在 Thread-2 上锁的过程中，如果 Thread-3，Thread-4，Thread-5 也来执行 synchronized(obj)，就会进入 EntryList BLOCKED
- Thread-2 执行完同步代码块的内容，然后唤醒 EntryList 中等待的线程来竞争锁，竞争是非公平的
- 图中 WaitSet 中的 Thread-0，Thread-1 是之前获得过锁，但条件不满足进入 WAITING 状态的线程，后面讲 wait-notify 时会分析

> 注意:
>
> - synchronized 必须是进入同一个对象的 monitor 才有上述的效果
>
> - 不加 synchronized 的对象不会关联监视器，不遵从以上规则

### synchronized原理(Java字节码层面理解monitor)

```java
static final Object lock = new Object();
static int counter = 0;

public static void main(String[] args) { 
  synchronized (lock) {
		counter++; 
  }
}
```

对应的字节码为：

```java
public static void main(java.lang.String[]); 
	descriptor: ([Ljava/lang/String;)V 
  flags: ACC_PUBLIC, ACC_STATIC
 Code:
	stack=2, locals=3, args_size=1
		0: getstatic #2              // <- lock引用 (synchronized开始) 
    3: dup                       // 复制
		4: astore_1                  // lock引用 -> slot 1，存储lock引用
		5: monitorenter              // 将 lock对象 MarkWord 置为 Monitor 指针
		6: getstatic #3              // <- 1
		9: iconst_1									 // 准备常数 1
	 10: iadd                      // +1
	 11: putstatic #3              // -> i
   14: aload_1                   // <- lock引用
	 15: monitorexit               // 将lock对象MarkWord重置,唤醒 EntryList     
	 16: goto 24 
   19: astore_2                  // e -> slot 2
	 20: aload_1                   // <- local引用
	 21: monitorexit               // 将lock对象MarkWord重置，唤醒 EntryList
   22: aload_2                   // <- slot 2 (e)
   23: athrow                    // throw e
   24: return
	Exception table:
	 from to target type
     6  16    19   any 
    19  22    19   any
	LineNumberTable: 
   line 8: 0
	 line 9: 6
   line 10: 14 
   line 11: 24
	LocalVariableTable:
	 Start Length Slot Name Signature
     0       25   0  args [Ljava/lang/String; 
  StackMapTable: number_of_entries = 2
   frame_type = 255 /* full_frame */
    offset_delta = 19
    locals = [ class "[Ljava/lang/String;", class java/lang/Object ]         	   stack = [ class java/lang/Throwable ]
	frame_type = 250 /* chop */ 
    offset_delta = 4
```

> 注意：方法级别的 synchronized 不会在字节码指令中有所体现

## 锁消除

```java
@Fork(1) 
@BenchmarkMode(Mode.AverageTime) 
@Warmup(iterations=3) 
@Measurement(iterations=5) 
@OutputTimeUnit(TimeUnit.NANOSECONDS) 
public class MyBenchmark {
	static int x = 0;
  
	@Benchmark
	public void a() throws Exception {
		x++; 
  }
  
  /*
   * JIT即时编译器编译方法b时，会发现对象o不会逃离方法b的作用范围，所以不会出现线程安全问题。
   * 所以方法b会被优化为不加锁即 ==> 锁消除
   */
	@Benchmark
	public void b() throws Exception { 
    Object o = new Object(); 
    synchronized (o) {
			x++;
		}
  }
}                  
```

执行 `java -jar benchmarks.jar`

```java
 Benchmark            Mode        Samples      Score        Score error       Units 
 c.i.MyBenchmark.a    avgt           5          1.542           0.056         ns/op 
 c.i.MyBenchmark.b    avgt           5          1.518           0.091         ns/op
```

锁消除也是可以关闭的：通过VM参数` -XX:-EliminateLocks`

执行 `java -XX:-EliminateLocks -jar benchmarks.jar`

```java
 Benchmark            Mode        Samples      Score        Score error       Units 
 c.i.MyBenchmark.a    avgt           5          1.507           0.108         ns/op
 c.i.MyBenchmark.b    avgt           5          16.976          1.572         ns/op
```

## 锁粗化

对相同对象多次加锁，导致线程发生多次重入，可以使用锁粗化方式来优化，这不同于之前讲的细分锁的粒度。

例子：

- 当一个方法重复调用synchorized锁，比如在for循环中。
- 这时就可以优化为在synchorized锁中执行for循环实现锁的粗化。

## wait、notify

### 引入

- 由于条件不满足，小南不能继续进行计算
- 但小南如果一直占用着锁，其它人就得一直阻塞，效率太低
- 于是老王单开了一间休息室(调用 wait 方法)，让小南到休息室(WaitSet)等去了，但这时锁释放开， 其它人可以由老王随机安排进屋
- 直到小M将烟送来，大叫一声 [ 你的烟到了 ] (调用 notify 方法)
- 小南于是可以离开休息室，重新进入竞争锁的队列

### 原理

![](images/wait与notify.png)

- Owner 线程发现条件不满足，调用 wait 方法，即可进入 WaitSet 变为 WAITING 状态
- BLOCKED 和 WAITING 的线程都处于阻塞状态，不占用 CPU 时间片
- BLOCKED 线程会在 Owner 线程释放锁时唤醒
- WAITING 线程会在 Owner 线程调用 notify 或 notifyAll 时唤醒，但唤醒后并不意味者立刻获得锁，仍需进入 EntryList 重新竞争

### API 介绍

- obj.wait() 让进入 object 监视器的线程到 waitSet 等待 
- obj.notify() 在 object 上正在 waitSet 等待的线程中挑一个唤醒 
- obj.notifyAll() 让 object 上正在 waitSet 等待的线程全部唤醒

它们都是线程之间进行协作的手段，都属于 Object 对象的方法。<span style="color:red">必须获得此对象的锁，才能调用这几个方法</span>

```java
public class Test {
    private static Logger log = LoggerFactory.getLogger(Test.class);
    final static Object obj = new Object();

    public static void main(String[] args) throws InterruptedException {
        new Thread(() -> {
            synchronized (obj) {
                log.debug("执行....");
                try {
                    obj.wait(); // 让线程在obj上一直等待下去
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
                log.debug("其它代码....");
            }
        }).start();
      
        new Thread(() -> {
            synchronized (obj) {
                log.debug("执行....");
                try {
                    obj.wait(); // 让线程在obj上一直等待下去
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
                log.debug("其它代码....");
            }
        }).start();
      
        // 主线程两秒后执行
        Thread.sleep(2);
        log.debug("唤醒 obj 上其它线程");
        synchronized (obj) {
          // 唤醒obj上一个线程
          obj.notify();
          // 唤醒obj上所有等待线程
          // obj.notifyAll();  
        }
    }
}
```

notify 的一种结果

```java
20:00:53.096 [Thread-0] c.TestWaitNotify - 执行.... 
20:00:53.099 [Thread-1] c.TestWaitNotify - 执行.... 
20:00:55.096 [main] c.TestWaitNotify - 唤醒 obj 上其它线程 
20:00:55.096 [Thread-0] c.TestWaitNotify - 其它代码....
```

notifyAll 的结果

```java
19:58:15.457 [Thread-0] c.TestWaitNotify - 执行.... 
19:58:15.460 [Thread-1] c.TestWaitNotify - 执行.... 
19:58:17.456 [main] c.TestWaitNotify - 唤醒 obj 上其它线程 
19:58:17.456 [Thread-1] c.TestWaitNotify - 其它代码.... 
19:58:17.456 [Thread-0] c.TestWaitNotify - 其它代码....
```

`wait()` 方法会释放对象的锁，进入 WaitSet 等待区，从而让其他线程就机会获取对象的锁。无限制等待，直到 notify 为止

`wait(long n)` 有时限的等待, 到 n 毫秒后结束等待，或是被 notify

### wait、notify的正确使用方式

开始之前先看看`sleep(long n)` 和` wait(long n) `的区别：

- sleep 是 Thread 方法，而 wait 是 Object 的方法
- sleep 不需要强制和 synchronized 配合使用，但 wait 需要 和 synchronized 一起用
- sleep 在睡眠的同时，不会释放对象锁的，但 wait 在等待的时候会释放对象锁
- 它们的状态都是 TIMED_WAITING

#### step 1

```java
static final Object room = new Object();
static boolean hasCigarette = false;
static boolean hasTakeout = false;
```

思考下面的解决方案好不好，为什么？

```java
new Thread(() -> { 
  synchronized (room) {
		log.debug("有烟没?[{}]", hasCigarette); 
    if (!hasCigarette) {
			log.debug("没烟，先歇会!");
			sleep(2); 
    }
		log.debug("有烟没?[{}]", hasCigarette); 
    if (hasCigarette) {
			log.debug("可以开始干活了"); 
    }
	}
}, "小南").start();

for (int i = 0; i < 5; i++) { 
  new Thread(() -> {
		synchronized (room) { 
      log.debug("可以开始干活了");
		}
	}, "其它人").start();
}

sleep(1);

new Thread(() -> {
// 这里能不能加 synchronized (room)? 
  hasCigarette = true; log.debug("烟到了噢!");
}, "送烟的").start();
```

输出:

```java
20:49:49.883 [小南] c.TestCorrectPosture - 有烟没?[false] 
20:49:49.887 [小南] c.TestCorrectPosture - 没烟，先歇会! 
20:49:50.882 [送烟的] c.TestCorrectPosture - 烟到了噢! 
20:49:51.887 [小南] c.TestCorrectPosture - 有烟没?[true] 
20:49:51.887 [小南] c.TestCorrectPosture - 可以开始干活了
20:49:51.887 [其它人] c.TestCorrectPosture - 可以开始干活了 
20:49:51.887 [其它人] c.TestCorrectPosture - 可以开始干活了 
20:49:51.888 [其它人] c.TestCorrectPosture - 可以开始干活了 
20:49:51.888 [其它人] c.TestCorrectPosture - 可以开始干活了 
20:49:51.888 [其它人] c.TestCorrectPosture - 可以开始干活了
```

- 其它干活的线程，都要一直阻塞，效率太低
- 小南线程必须睡足 2s 后才能醒来，就算烟提前送到，也无法立刻醒来
- 加了 synchronized (room) 后，就好比小南在里面反锁了门睡觉，烟根本没法送进门。
- 解决方法，使用 wait - notify 机制

#### step 2

思考下面的解决方案行吗？为什么？

```java
new Thread(() -> { 
  synchronized (room) {
		log.debug("有烟没?[{}]", hasCigarette); 
    if (!hasCigarette) {
			log.debug("没烟，先歇会!"); 
      try {
				room.wait(2000);
			} catch (InterruptedException e) {
				e.printStackTrace(); 
      }
		}
		log.debug("有烟没?[{}]", hasCigarette); if (hasCigarette) {
		log.debug("可以开始干活了"); }
	}
}, "小南").start();

for (int i = 0; i < 5; i++) { 
  new Thread(() -> {
		synchronized (room) { 
    	log.debug("可以开始干活了");
		}
	}, "其它人").start();
}

sleep(1);

new Thread(() -> {
	synchronized (room) { 
    hasCigarette = true; 
    log.debug("烟到了噢!"); 
    room.notify();
	}
}, "送烟的").start();
```

输出

```java
20:51:42.489 [小南] c.TestCorrectPosture - 有烟没?[false] 
20:51:42.493 [小南] c.TestCorrectPosture - 没烟，先歇会! 
20:51:42.493 [其它人] c.TestCorrectPosture - 可以开始干活了 
20:51:42.493 [其它人] c.TestCorrectPosture - 可以开始干活了 
20:51:42.494 [其它人] c.TestCorrectPosture - 可以开始干活了 
20:51:42.494 [其它人] c.TestCorrectPosture - 可以开始干活了 
20:51:42.494 [其它人] c.TestCorrectPosture - 可以开始干活了 
20:51:43.490 [送烟的] c.TestCorrectPosture - 烟到了噢! 
20:51:43.490 [小南] c.TestCorrectPosture - 有烟没?[true] 
20:51:43.490 [小南] c.TestCorrectPosture - 可以开始干活了
```

- 解决了其它干活的线程阻塞的问题
- 但如果有其它线程也在等待条件呢?

#### step 3

```java
new Thread(() -> { 
  synchronized (room) {
    log.debug("有烟没?[{}]", hasCigarette); 
    if (!hasCigarette) {
      log.debug("没烟，先歇会!"); 
      try {
        room.wait();
      } catch (InterruptedException e) {
        e.printStackTrace(); 
      }
    }
    log.debug("有烟没?[{}]", hasCigarette); 
    if (hasCigarette) {
      log.debug("可以开始干活了"); 
    } else {
      log.debug("没干成活..."); 
    }
  }
}, "小南").start();

new Thread(() -> { 
  synchronized (room) {
    Thread thread = Thread.currentThread(); 
    log.debug("外卖送到没?[{}]", hasTakeout); 
    if (!hasTakeout) {
			log.debug("没外卖，先歇会!"); 
      try {
				room.wait();
			} catch (InterruptedException e) {
				e.printStackTrace(); }
			}
			log.debug("外卖送到没?[{}]", hasTakeout); 
    	if (hasTakeout) {
				log.debug("可以开始干活了"); 
      } else {
				log.debug("没干成活..."); 
      }
		}
}, "小女").start();

sleep(1);

new Thread(() -> {
	synchronized (room) { 
    hasTakeout = true; 
    log.debug("外卖到了噢!"); 
    room.notify();
	}
}, "送外卖的").start();
```

输出

```java
20:53:12.173 [小南] c.TestCorrectPosture - 有烟没?[false] 
20:53:12.176 [小南] c.TestCorrectPosture - 没烟，先歇会! 
20:53:12.176 [小女] c.TestCorrectPosture - 外卖送到没?[false] 
20:53:12.176 [小女] c.TestCorrectPosture - 没外卖，先歇会! 
20:53:13.174 [送外卖的] c.TestCorrectPosture - 外卖到了噢! 
20:53:13.174 [小南] c.TestCorrectPosture - 有烟没?[false] 
20:53:13.174 [小南] c.TestCorrectPosture - 没干成活...
```

- notify 只能随机唤醒一个 WaitSet 中的线程，这时如果有其它线程也在等待，那么就可能唤醒不了正确的线程，称之为【虚假唤醒】
- 解决方法，改为 notifyAll

#### step 4

```java
....
  
new Thread(() -> { 
  synchronized (room) {
		hasTakeout = true; 
    log.debug("外卖到了噢!"); 
    room.notifyAll();
	}
}, "送外卖的").start();
```

输出

```java
20:55:23.978 [小南] c.TestCorrectPosture - 有烟没?[false]
20:55:23.982 [小南] c.TestCorrectPosture - 没烟，先歇会! 
20:55:23.982 [小女] c.TestCorrectPosture - 外卖送到没?[false] 
20:55:23.982 [小女] c.TestCorrectPosture - 没外卖，先歇会! 
20:55:24.979 [送外卖的] c.TestCorrectPosture - 外卖到了噢! 
20:55:24.979 [小女] c.TestCorrectPosture - 外卖送到没?[true] 
20:55:24.980 [小女] c.TestCorrectPosture - 可以开始干活了 
20:55:24.980 [小南] c.TestCorrectPosture - 有烟没?[false] 
20:55:24.980 [小南] c.TestCorrectPosture - 没干成活...
```

- 用 notifyAll 仅解决某个线程的唤醒问题，但使用 if + wait 判断仅有一次机会，一旦条件不成立，就没有重新 判断的机会了
- 解决方法，用 while + wait，当条件不成立，再次 wait

#### step 5

将 if 改为 while

```java
if (!hasCigarette) { 
  log.debug("没烟，先歇会!");
  try {
		room.wait();
	} catch (InterruptedException e) {
		e.printStackTrace(); }
}
```

改动后

```java
while (!hasCigarette) { 
  log.debug("没烟，先歇会!"); 
  try {
		room.wait();
	} catch (InterruptedException e) {
		e.printStackTrace(); 
  }
}
```

输出

```java
20:58:34.322 [小南] c.TestCorrectPosture - 有烟没?[false] 
20:58:34.326 [小南] c.TestCorrectPosture - 没烟，先歇会! 
20:58:34.326 [小女] c.TestCorrectPosture - 外卖送到没?[false] 
20:58:34.326 [小女] c.TestCorrectPosture - 没外卖，先歇会! 
20:58:35.323 [送外卖的] c.TestCorrectPosture - 外卖到了噢! 
20:58:35.324 [小女] c.TestCorrectPosture - 外卖送到没?[true] 
20:58:35.324 [小女] c.TestCorrectPosture - 可以开始干活了 
20:58:35.324 [小南] c.TestCorrectPosture - 没烟，先歇会!
```

#### 总结

```java
synchronized(lock) { 
  while(条件不成立) {
		lock.wait(); 
  }
	// 干活 
}

//另一个线程 
synchronized(lock) {
	lock.notifyAll(); 
}
```

### 同步模式之保护性暂停

#### 定义

即 Guarded Suspension，用在一个线程等待另一个线程的执行结果

要点：

- 有一个结果需要从一个线程传递到另一个线程，让他们关联同一个 GuardedObject 
- 如果有结果不断从一个线程到另一个线程那么可以使用消息队列(见生产者/消费者) 
- JDK 中，join 的实现、Future 的实现，采用的就是此模式 
- 因为要等待另一方的结果，因此归类到同步模式

![](images/同步模式之保护性暂停.png)

#### 实现

```java
class GuardedObject { 
  private Object response;
	private final Object lock = new Object();

  public Object get() { 
    synchronized (lock) { 
      // 条件不满足则等待
			while (response == null) { 
        try {
					lock.wait();
				} catch (InterruptedException e) {
					e.printStackTrace(); 
        }
			}
			return response;
		}
  }
  
	public void complete(Object response) { 
    synchronized (lock) {
			// 条件满足，通知等待线程 
      this.response = response; 
      lock.notifyAll();
		} 
  }
}
```

#### 应用

一个线程等待另一个线程的执行结果

```java
public static void main(String[] args) { 
  GuardedObject guardedObject = new GuardedObject(); 
 
  new Thread(() -> {
		try {
			// 子线程执行下载
			List<String> response = download(); 
      log.debug("download complete..."); 
      guardedObject.complete(response);
		} catch (IOException e) { 
      e.printStackTrace();
		} 
  }).start();
  
	log.debug("waiting...");
	// 主线程阻塞等待
	Object response = guardedObject.get();
	log.debug("get response: [{}] lines", ((List<String>) response).size());
}
```

执行结果

```java
08:42:18.568 [main] c.TestGuardedObject - waiting...
08:42:23.312 [Thread-0] c.TestGuardedObject - download complete... 
08:42:23.312 [main] c.TestGuardedObject - get response: [3] lines
```

#### 带超时的GuardedObject

如果要控制超时时间呢

```java
class GuardedObjectV2 {
	private Object response;
	private final Object lock = new Object();
  
  public Object get(long millis) { 
    synchronized (lock) {
			// 1) 记录最初时间
			long begin = System.currentTimeMillis(); 
      // 2) 已经经历的时间
			long timePassed = 0;
			while (response == null) {
				// 4) 假设 millis 是 1000，结果在 400 时唤醒了，那么还有 600 要等 
      	long waitTime = millis - timePassed;
				log.debug("waitTime: {}", waitTime);
				if (waitTime <= 0) {
					log.debug("break...");
					break; 
        }
				try { 
          lock.wait(waitTime); //存在虚假唤醒的可能
				} catch (InterruptedException e) { 
          e.printStackTrace();
				}
				// 3) 如果提前被唤醒，这时已经经历的时间假设为 400 
        timePassed = System.currentTimeMillis() - begin; 
        log.debug("timePassed: {}, object is null {}",timePassed, response == null); 
      }
      return response;
    } 
	}

  public void complete(Object response) { 
    synchronized (lock) {
      // 条件满足，通知等待线程 
      this.response = response; 
      log.debug("notify..."); 
      lock.notifyAll();
    }
  }
}
```

测试，没有超时

```java
public static void main(String[] args) { 
  GuardedObjectV2 v2 = new GuardedObjectV2(); 
  
  new Thread(() -> {
		sleep(1);
		v2.complete(null); //虚假唤醒
		sleep(1);
		v2.complete(Arrays.asList("a", "b", "c"));
	}).start();
  
	Object response = v2.get(2500);
	if (response != null) {
		log.debug("get response: [{}] lines", ((List<String>) response).size());
  } else {
		log.debug("can't get response");
	} 
}
```

输出

```java
08:49:39.917 [main] c.GuardedObjectV2 - waitTime: 2500
08:49:40.917 [Thread-0] c.GuardedObjectV2 - notify...
08:49:40.917 [main] c.GuardedObjectV2 - timePassed: 1003, object is null true 
08:49:40.917 [main] c.GuardedObjectV2 - waitTime: 1497
08:49:41.918 [Thread-0] c.GuardedObjectV2 - notify...
08:49:41.918 [main] c.GuardedObjectV2 - timePassed: 2004, object is null false 
08:49:41.918 [main] c.TestGuardedObjectV2 - get response: [3] lines
```

测试，超时

```java
// 等待时间不足
List<String> lines = v2.get(1500);
```

输出

```java
08:47:54.963 [main] c.GuardedObjectV2 - waitTime: 1500
08:47:55.963 [Thread-0] c.GuardedObjectV2 - notify...
08:47:55.963 [main] c.GuardedObjectV2 - timePassed: 1002, object is null true 
08:47:55.963 [main] c.GuardedObjectV2 - waitTime: 498
08:47:56.461 [main] c.GuardedObjectV2 - timePassed: 1500, object is null true 
08:47:56.461 [main] c.GuardedObjectV2 - waitTime: 0
08:47:56.461 [main] c.GuardedObjectV2 - break...
08:47:56.461 [main] c.TestGuardedObjectV2 - can't get response
08:47:56.963 [Thread-0] c.GuardedObjectV2 - notify...
```

#### 总结

- 保护性暂停模式和join方法都可以实现一个线程等待另一个线程的执行结果

- 保护性暂停模式相对于join方法的好处是
  - 一个线程执行完某件事并得到结果通知另一个在等待结果的线程后，还可以做一些其他事情
  - 使用join方法后，等待结果的那个变量只能设置为全局的
- 保护性暂停是一个线程等待另一个线程的结果，join是一个线程等待另一个线程的结束

#### 多任务版 GuardedObject

图中 Futures 就好比居民楼一层的信箱(每个信箱有房间编号)，左侧的 t0，t2，t4 就好比等待邮件的居民，右侧的 t1，t3，t5 就好比邮递员

如果需要在多个类之间使用 GuardedObject 对象，作为参数传递不是很方便，因此设计一个用来解耦的中间类， 这样不仅能够解耦【结果等待者】和【结果生产者】，还能够同时支持多个任务的管理

![](images/多任务版GuardedObject.png)

新增 id 用来标识 Guarded Object

```java
class GuardedObject {
	// 标识 Guarded Object
	private int id;

  public GuardedObject(int id) { 
    this.id = id;
	}

  public int getId() { 
    return id;
	}
  
	// 结果
	private Object response;
  
	// 获取结果
	// timeout 表示要等待多久 2000 
  public Object get(long timeout) {
		synchronized (this) {
      // 开始时间 15:00:00
      long begin = System.currentTimeMillis(); // 经历的时间
      long passedTime = 0;
      while (response == null) {
        // 这一轮循环应该等待的时间
        long waitTime = timeout - passedTime; // 经历的时间超过了最大等待时间时，退出循环 
        if (timeout - passedTime <= 0) {
          break; 
        }
        try {
          this.wait(waitTime); // 虚假唤醒 15:00:01
        } catch (InterruptedException e) { 
          e.printStackTrace();
        }
        // 求得经历时间
        passedTime = System.currentTimeMillis() - begin; // 15:00:02 1s 
      }
      return response; 
    }
	}
  
	// 产生结果
	public void complete(Object response) {
		synchronized (this) {
			// 给结果成员变量赋值 
      this.response = response; this.notifyAll();
		} 
  }
}
```

中间解耦类

```java
class Mailboxes {
	private static Map<Integer, GuardedObject> boxes = new Hashtable<>();
	private static int id = 1;

  // 产生唯一 id
	private static synchronized int generateId() {
		return id++; 
  }
  
	public static GuardedObject getGuardedObject(int id) { 
    return boxes.remove(id);
	}

  public static GuardedObject createGuardedObject() { 
    GuardedObject go = new GuardedObject(generateId()); 
    boxes.put(go.getId(), go);
		return go;
	}
  
	public static Set<Integer> getIds() { 
    return boxes.keySet();
	} 
}
```

业务相关类

```java
class People extends Thread{ 
  @Override
	public void run() { // 收信
		GuardedObject guardedObject = Mailboxes.createGuardedObject(); 
    log.debug("开始收信 id:{}", 
    guardedObject.getId());
		Object mail = guardedObject.get(5000);
		log.debug("收到信 id:{}, 内容:{}", guardedObject.getId(), mail);
	} 
}
```

```java
class Postman extends Thread { 
  private int id;
	private String mail;

  public Postman(int id, String mail) { 
    this.id = id;
		this.mail = mail; 
  }
  
	@Override
	public void run() {
		GuardedObject guardedObject = Mailboxes.getGuardedObject(id); 
    log.debug("送信 id:{}, 内容:{}", id, mail); 
    guardedObject.complete(mail);
	}
}
```

测试

```java
public static void main(String[] args) throws Exception { 
  for (int i = 0; i < 3; i++) {
		new People().start(); 
  }
  
	Thread.sleep(1);
	for (Integer id : Mailboxes.getIds()) {
		new Postman(id, "内容" + id).start(); 
  }
}
```

运行某次结果

```java
10:35:05.689 c.People [Thread-1] - 开始收信 id:3 
10:35:05.689 c.People [Thread-2] - 开始收信 id:1 
10:35:05.689 c.People [Thread-0] - 开始收信 id:2 
10:35:06.688 c.Postman [Thread-4] - 送信 id:2, 内容:内容2 
10:35:06.688 c.Postman [Thread-5] - 送信 id:1, 内容:内容1 
10:35:06.688 c.People [Thread-0] - 收到信 id:2, 内容:内容2 
10:35:06.688 c.People [Thread-2] - 收到信 id:1, 内容:内容1 
10:35:06.688 c.Postman [Thread-3] - 送信 id:3, 内容:内容3 
10:35:06.689 c.People [Thread-1] - 收到信 id:3, 内容:内容3
```

### 异步模式之生产者/消费者

#### 定义

要点

- 与前面的保护性暂停中的 GuardObject 不同，<span style="color:red">不需要产生结果和消费结果的线程一一对应 </span>
- 消费队列可以用来平衡生产和消费的线程资源 
- 生产者仅负责产生结果数据，不关心数据该如何处理，而消费者专心处理结果数据 
- 消息队列是有容量限制的，满时不会再加入数据，空时不会再消耗数据

- JDK 中各种阻塞队列，采用的就是这种模式

![](images/阻塞队列.png)

#### 实现

```java
class Message { 
  private int id;
	private Object message;

  public Message(int id, Object message) { 
    this.id = id;
		this.message = message; 
  }

  public int getId() { 
    return id;
	}
  
	public Object getMessage() { 
    return message;
	} 
}

/**
 * 这里的消息队列是对于线程间通信的，而像RabbitMQ这种是属于进程间通信的
 */
class MessageQueue {
	private LinkedList<Message> queue; 
  private int capacity;

  public MessageQueue(int capacity) { 
    this.capacity = capacity;
		queue = new LinkedList<>();
	}
  
	public Message take() { 
    synchronized (queue) {
      while (queue.isEmpty()) { 
        log.debug("没货了, wait"); 
        try {
          queue.wait();
        } catch (InterruptedException e) {
          e.printStackTrace();
        }
      }

      Message message = queue.removeFirst(); 
      queue.notifyAll();
      return message;
    } 
  }
  

  public void put(Message message) { 
    synchronized (queue) {
			while (queue.size() == capacity) { 
        log.debug("库存已达上限, wait"); 
        try {
					queue.wait();
				} catch (InterruptedException e) {
					e.printStackTrace(); 
        }
			} 
      queue.addLast(message); 
      queue.notifyAll();
		} 
  }
}
```

#### 应用

```java
MessageQueue messageQueue = new MessageQueue(2); 
// 4 个生产者线程, 下载任务
for (int i = 0; i < 4; i++) {
	int id = i;
	new Thread(() -> {
		try {
  		log.debug("download...");
			List<String> response = Downloader.download(); 
      log.debug("try put message({})", id); 
      messageQueue.put(new Message(id, response));
		} catch (IOException e) {
      e.printStackTrace();
		}
	}, "生产者" + i).start();
}

// 1 个消费者线程, 处理结果 
new Thread(() -> {
	while (true) {
		Message message = messageQueue.take();
		List<String> response = (List<String>) message.getMessage();
		log.debug("take message({}): [{}] lines", message.getId(), response.size());
	}
}, "消费者").start();
```

某次运行结果

```java
10:48:38.070 [生产者3] c.TestProducerConsumer - download...
10:48:38.070 [生产者0] c.TestProducerConsumer - download...
10:48:38.070 [消费者] c.MessageQueue - 没货了, wait
10:48:38.070 [生产者1] c.TestProducerConsumer - download...
10:48:38.070 [生产者2] c.TestProducerConsumer - download...
10:48:41.236 [生产者1] c.TestProducerConsumer - try put message(1) 
10:48:41.237 [生产者2] c.TestProducerConsumer - try put message(2) 
10:48:41.236 [生产者0] c.TestProducerConsumer - try put message(0) 
10:48:41.237 [生产者3] c.TestProducerConsumer - try put message(3) 
10:48:41.239 [生产者2] c.MessageQueue - 库存已达上限, wait
10:48:41.240 [生产者1] c.MessageQueue - 库存已达上限, wait
10:48:41.240 [消费者] c.TestProducerConsumer - take message(0): [3] lines 
10:48:41.240 [生产者2] c.MessageQueue - 库存已达上限, wait
10:48:41.240 [消费者] c.TestProducerConsumer - take message(3): [3] lines 
10:48:41.240 [消费者] c.TestProducerConsumer - take message(1): [3] lines 
10:48:41.240 [消费者] c.TestProducerConsumer - take message(2): [3] lines 
10:48:41.240 [消费者] c.MessageQueue - 没货了, wait
```

## 原理之join

是调用者轮询检查线程 alive 状态

```java
t1.join();
```

等价于

```java
synchronized (t1) {
	// 调用者线程进入 t1 的 waitSet 等待, 直到 t1 运行结束 
  while (t1.isAlive()) {
		t1.wait(0); 
  }
}
```

注意：join 体现的是【保护性暂停】模式

## Park、Unpark

#### 基本使用

它们是 LockSupport 类中的方法

```java
// 暂停当前线程 ，这里park后对应的线程状态为 WAITING
LockSupport.park();

// 恢复某个线程的运行
LockSupport.unpark(暂停线程对象)
```

**先 park 再 unpark**

```java
Thread t1 = new Thread(() -> { 
  log.debug("start..."); 
  sleep(1); 
  log.debug("park..."); 
  LockSupport.park(); 
  log.debug("resume...");
},"t1"); t1.start();

sleep(2); 
log.debug("unpark..."); 
LockSupport.unpark(t1);
```

输出

```java
18:42:52.585 c.TestParkUnpark [t1] - start... 
18:42:53.589 c.TestParkUnpark [t1] - park... 
18:42:54.583 c.TestParkUnpark [main] - unpark...
18:42:54.583 c.TestParkUnpark [t1] - resume...
```

**先 unpark 再 park**

```java
Thread t1 = new Thread(() -> { 
  log.debug("start..."); 
  sleep(2); 
  log.debug("park..."); 
  LockSupport.park(); 
  log.debug("resume...");
}, "t1"); t1.start();

sleep(1); 
log.debug("unpark..."); 
LockSupport.unpark(t1);
```

输出

```java
18:43:50.765 c.TestParkUnpark [t1] - start... 
18:43:51.764 c.TestParkUnpark [main] - unpark... 
18:43:52.769 c.TestParkUnpark [t1] - park... 
18:43:52.769 c.TestParkUnpark [t1] - resume...
```

#### 特点

与 Object 的 wait & notify 相比

- wait，notify 和 notifyAll 必须配合 Object Monitor 一起使用，而 park，unpark 不必
- park & unpark 是以线程为单位来【阻塞】和【唤醒】线程，而 notify 只能随机唤醒一个等待线程，notifyAll 是唤醒所有等待线程，就不那么【精确】
- park & unpark 可以先 unpark，而 wait & notify 不能先 notify

#### 原理

每个线程都有自己的一个 Parker 对象，由三部分组成 _counter ， _cond 和 _mutex 打个比喻

- 线程就像一个旅人，Parker 就像他随身携带的背包，条件变量就好比背包中的帐篷。_counter 就好比背包中 的备用干粮(0 为耗尽，1 为充足)
- 调用 park 就是要看需不需要停下来歇息 

  - 如果备用干粮耗尽，那么钻进帐篷歇息
  - 如果备用干粮充足，那么不需停留，继续前进 
- 调用 unpark，就好比令干粮充足

  - 如果这时线程还在帐篷，就唤醒让他继续前进
  - 如果这时线程还在运行，那么下次他调用 park 时，仅是消耗掉备用干粮，不需停留继续前进。因为背包空间有限，多次调用 unpark 仅会补充一份备用干粮

![](images/Park与Unpark1.png)

- 当前线程调用 Unsafe.park() 方法
- 检查 _counter ，本情况为 0，这时，获得 _mutex 互斥锁 
- 线程进入 _cond 条件变量阻塞
- 设置 _counter = 0

![](images/Park与Unpark2.png)

- 调用 Unsafe.unpark(Thread_0) 方法，设置 _counter 为 1
- 唤醒 _cond 条件变量中的 Thread_0
- Thread_0 恢复运行
- 设置 _counter 为 0

![](images/Park与Unpark3.png)

- 调用 Unsafe.unpark(Thread_0) 方法，设置 _counter 为 1
- 当前线程调用 Unsafe.park() 方法
- 检查 _counter ，本情况为 1，这时线程无需阻塞，继续运行
- 设置 _counter 为 0

## 线程状态转换

![](images/线程状态转换.png)

假设有线程 `Thread t`

### NEW => RUNNABLE

当调用 t.start() 方法时，由 NEW --> RUNNABLE

### RUNNABLE <=> WAITING

#### 情况一

t 线程用 synchronized(obj) 获取了对象锁后

- 调用 obj.wait() 方法时，t 线程从 RUNNABLE --> WAITING 
- 调用 obj.notify() ， obj.notifyAll() ， t.interrupt() 时
  - 竞争锁成功，t 线程从 WAITING --> RUNNABLE 
  - 竞争锁失败，t 线程从 WAITING --> BLOCKED

```java
public class TestWaitNotify {
	final static Object obj = new Object();
  
	public static void main(String[] args) {
  	new Thread(() -> { 
      synchronized (obj) {
				log.debug("执行...."); 
      	try {
					obj.wait();
				} catch (InterruptedException e) {
					e.printStackTrace(); 
      	}
				log.debug("其它代码...."); // 断点 
      }
		},"t1").start();
      
		new Thread(() -> { 
      synchronized (obj) {
				log.debug("执行...."); 
        try {
					obj.wait();
				} catch (InterruptedException e) {
					e.printStackTrace(); 
        }
				log.debug("其它代码...."); // 断点 
      }
		},"t2").start();
    
		sleep(0.5);
		log.debug("唤醒 obj 上其它线程"); 
    synchronized (obj) {
			obj.notifyAll(); // 唤醒obj上所有等待线程 断点 
    }
	} 
}
```

#### 情况二

- 当前线程调用 t.join() 方法时，当前线程从 RUNNABLE --> WAITING 。注意是当前线程在t 线程对象的监视器monitor上等待

- t 线程运行结束，或调用了当前线程的 interrupt() 时，当前线程从 WAITING --> RUNNABLE

#### 情况三

- 当前线程调用 LockSupport.park() 方法会让当前线程从 RUNNABLE --> WAITING
- 调用 LockSupport.unpark(目标线程) 或调用了线程 的 interrupt() ，会让目标线程从 WAITING --> RUNNABLE

### RUNNABLE <=> TIMED_WAITING

#### 情况一

t 线程用 synchronized(obj) 获取了对象锁后

- 调用 obj.wait(long n) 方法时，t 线程从 RUNNABLE --> TIMED_WAITING
- t 线程等待时间超过了 n 毫秒，或调用 obj.notify() ， obj.notifyAll() ， t.interrupt() 时
  - 竞争锁成功，t 线程从 TIMED_WAITING --> RUNNABLE 
  - 竞争锁失败，t 线程从 TIMED_WAITING --> BLOCKED

#### 情况二

- 当前线程调用 t.join(long n) 方法时，当前线程从 RUNNABLE --> TIMED_WAITING。注意是当前线程在t 线程对象的监视器monitor上等待

- 当前线程等待时间超过了 n 毫秒，或t 线程运行结束，或调用了当前线程的 interrupt() 时，当前线程从 TIMED_WAITING --> RUNNABLE

#### 情况三

- 当前线程调用 Thread.sleep(long n) ，当前线程从 RUNNABLE --> TIMED_WAITING

- 当前线程等待时间超过了 n 毫秒，当前线程从 TIMED_WAITING --> RUNNABLE

#### 情况四

- 当前线程调用 LockSupport.parkNanos(long nanos) 或 LockSupport.parkUntil(long millis) 时，当前线 程从 RUNNABLE --> TIMED_WAITING
- 调用 LockSupport.unpark(目标线程) 或调用了线程 的 interrupt() ，或是等待超时，会让目标线程从TIMED_WAITING--> RUNNABLE

### RUNNABLE <=> BLOCKED

- t 线程用 synchronized(obj) 获取了对象锁时如果竞争失败，从 RUNNABLE --> BLOCKED
- 持 obj 锁线程的同步代码块执行完毕，会唤醒该对象上所有 BLOCKED 的线程重新竞争，如果其中 t 线程竞争 成功，从 BLOCKED --> RUNNABLE ，其它失败的线程仍然 BLOCKED

### RUNNABLE <=> TERMINATED

当前线程所有代码运行完毕，进入 TERMINATED

## 多把锁的使用

> 多把不相干的锁

一间大屋子有两个功能:睡觉、学习，互不相干。 

- 现在小南要学习，小女要睡觉，但如果只用一间屋子(一个对象锁)的话，那么并发度很低 
- 解决方法是准备多个房间(多个对象锁)

例如

```java
class BigRoom {
	public void sleep() { 
    synchronized (this) {
			log.debug("sleeping 2 小时");
			Thread.sleep(2); 
    }
	}
  public void study() { 
    synchronized (this) {
			log.debug("study 1 小时");
			Thread.sleep(1); 
    }
	} 
}


// 执行
BigRoom bigRoom = new BigRoom(); 
new Thread(() -> {
	bigRoom.compute(); 
},"小南").start();

new Thread(() -> {
	bigRoom.sleep(); 
},"小女").start();
```

某次结果：

```java
 12:13:54.471 [小南] c.BigRoom - study 1 小时 
 12:13:55.476 [小女] c.BigRoom - sleeping 2 小时
```

改进：

```java
class BigRoom {
	private final Object studyRoom = new Object();
	private final Object bedRoom = new Object(); 
  
  public void sleep() {
  	synchronized (bedRoom) { 
      log.debug("sleeping 2 小时"); 
      Thread.sleep(2);
		} 
  }

  public void study() { 
    synchronized (studyRoom) {
			log.debug("study 1 小时");
			Thread.sleep(1); 
    }
	} 
}
```

某次结果

```java
12:15:35.069 [小南] c.BigRoom - study 1 小时 
12:15:35.069 [小女] c.BigRoom - sleeping 2 小时
```

**总结**

将锁的粒度细分

- 好处，是可以增强并发度
- 坏处，如果一个线程需要同时获得多把锁，就容易发生死锁

## 活跃性

#### 死锁

有这样的情况：一个线程需要同时获取多把锁，这时就容易发生死锁

- `t1 线程` 获得 `A对象` 锁，接下来想获取 `B对象` 的锁 

- `t2 线程` 获得 `B对象` 锁，接下来想获取 `A对象` 的锁例

```java
Object A = new Object(); 
Object B = new Object(); 

Thread t1 = new Thread(() -> {
	synchronized (A) { 
    log.debug("lock A"); 
    sleep(1); 
    synchronized (B) {
			log.debug("lock B");
			log.debug("操作..."); 
    }
	}
}, "t1");

Thread t2 = new Thread(() -> { 
  synchronized (B) {
		log.debug("lock B"); 
    sleep(0.5); 
    synchronized (A) {
			log.debug("lock A");
  		log.debug("操作..."); 
    }
	}	
}, "t2");

t1.start(); 
t2.start();
```

#### 定位死锁

检测死锁可以使用 jconsole工具，或者使用 jps 定位进程 id，再用 jstack 定位死锁：

```shell
cmd > jps
Picked up JAVA_TOOL_OPTIONS: -Dfile.encoding=UTF-8 12320 Jps
22816 KotlinCompileDaemon
33200 TestDeadLock  # JVM 进程
11508 Main
28468 Launcher
```

```shell
cmd > jstack 33200
Picked up JAVA_TOOL_OPTIONS: -Dfile.encoding=UTF-8
2018-12-29 05:51:40
Full thread dump Java HotSpot(TM) 64-Bit Server VM (25.91-b14 mixed mode):

"DestroyJavaVM" #13 prio=5 os_prio=0 tid=0x0000000003525000 nid=0x2f60 waiting on condition [0x0000000000000000]
	java.lang.Thread.State: RUNNABLE
	
"Thread-1" #12 prio=5 os_prio=0 tid=0x000000001eb69000 nid=0xd40 waiting for monitor entry [0x000000001f54f000]
	java.lang.Thread.State: BLOCKED (on object monitor)
		at thread.TestDeadLock.lambda$main$1(TestDeadLock.java:28)
		- waiting to lock <0x000000076b5bf1c0> (a java.lang.Object)
		- locked <0x000000076b5bf1d0> (a java.lang.Object)
		at thread.TestDeadLock$$Lambda$2/883049899.run(Unknown Source) 
		at java.lang.Thread.run(Thread.java:745)

"Thread-0" #11 prio=5 os_prio=0 tid=0x000000001eb68800 nid=0x1b28 waiting for monitor entry [0x000000001f44f000]
	java.lang.Thread.State: BLOCKED (on object monitor)
		at thread.TestDeadLock.lambda$main$0(TestDeadLock.java:15)
		- waiting to lock <0x000000076b5bf1d0> (a java.lang.Object)
		- locked <0x000000076b5bf1c0> (a java.lang.Object)
		at thread.TestDeadLock$$Lambda$1/495053715.run(Unknown Source) 
		at java.lang.Thread.run(Thread.java:745)

# 略去部分输出
Found one Java-level deadlock:
=============================
"Thread-1":
	waiting to lock monitor 0x000000000361d378 (object 0x000000076b5bf1c0, a java.lang.Object), which is held by "Thread-0"
"Thread-0":
	waiting to lock monitor 0x000000000361e768 (object 0x000000076b5bf1d0, a java.lang.Object), which is held by "Thread-1"
	
	
Java stack information for the threads listed above: =================================================== 
"Thread-1":
	at thread.TestDeadLock.lambda$main$1(TestDeadLock.java:28)
	- waiting to lock <0x000000076b5bf1c0> (a java.lang.Object)
	- locked <0x000000076b5bf1d0> (a java.lang.Object)
	at thread.TestDeadLock$$Lambda$2/883049899.run(Unknown Source) 
	at java.lang.Thread.run(Thread.java:745)
"Thread-0":
	at thread.TestDeadLock.lambda$main$0(TestDeadLock.java:15)
	- waiting to lock <0x000000076b5bf1d0> (a java.lang.Object)
	- locked <0x000000076b5bf1c0> (a java.lang.Object)
	at thread.TestDeadLock$$Lambda$1/495053715.run(Unknown Source) 
	at java.lang.Thread.run(Thread.java:745)

Found 1 deadlock.
```

- 避免死锁要注意加锁顺序
- 另外如果由于某个线程进入了死循环，导致其它线程一直等待，对于这种情况 linux 下可以通过 top 先定位到CPU 占用高的 Java 进程，再利用 top -Hp 进程id 来定位是哪个线程，最后再用 jstack 排查

#### 哲学家就餐问题

![](images/哲学家就餐问题.png)

有五位哲学家，围坐在圆桌旁。

- 他们只做两件事，思考和吃饭，思考一会吃口饭，吃完饭后接着思考。 
- 吃饭时要用两根筷子吃，桌上共有 5 根筷子，每位哲学家左右手边各有一根筷子。 如果筷子被身边的人拿着，自己就得等待

筷子类：

```java
class Chopstick { 
  String name;
	
  public Chopstick(String name) { 
    this.name = name;
	}

  @Override
	public String toString() { 
    return "筷子{" + name + '}';
	} 
}
```

哲学家类：

```java
class Philosopher extends Thread { 
  Chopstick left;
	Chopstick right;
                                   
  public Philosopher(String name, Chopstick left, Chopstick right) { 
    super(name);
		this.left = left;
		this.right = right; 
  }
  
	private void eat() { 
    log.debug("eating..."); 
    Thread.sleep(1);
	}
  

@Override
public void run() { 
    while (true) {
			// 获得左手筷子 
      synchronized (left) {
				// 获得右手筷子 
      	synchronized (right) {
					// 吃饭
					eat(); 
      	}
				// 放下右手筷子 
      }
			// 放下左手筷子 
    }
	} 
}
```

就餐：

```java
Chopstick c1 = new Chopstick("1");
Chopstick c2 = new Chopstick("2");
Chopstick c3 = new Chopstick("3");
Chopstick c4 = new Chopstick("4");
Chopstick c5 = new Chopstick("5");
new Philosopher("苏格拉底", c1, c2).start(); 
new Philosopher("柏拉图", c2, c3).start(); 
new Philosopher("亚里士多德", c3, c4).start(); 
new Philosopher("赫拉克利特", c4, c5).start(); 
new Philosopher("阿基米德", c5, c1).start();
```

执行不多会，就执行不下去了

```java
12:33:15.575 [苏格拉底] c.Philosopher - eating... 
12:33:15.575 [亚里士多德] c.Philosopher - eating... 
12:33:16.580 [阿基米德] c.Philosopher - eating... 
12:33:17.580 [阿基米德] c.Philosopher - eating... 
// 卡在这里, 不向下运行
```

使用 jconsole 检测死锁，发现

```java
-------------------------------------------------------------------------
名称: 阿基米德
状态: cn.itcast.Chopstick@1540e19d (筷子1) 上的BLOCKED, 拥有者: 苏格拉底 
总阻止数: 2, 总等待数: 1
  
堆栈跟踪: cn.itcast.Philosopher.run(TestDinner.java:48)
- 已锁定 cn.itcast.Chopstick@6d6f6e28 (筷子5) 

------------------------------------------------------------------------- 
名称: 苏格拉底
状态: cn.itcast.Chopstick@677327b6 (筷子2) 上的BLOCKED, 拥有者: 柏拉图 
总阻止数: 2, 总等待数: 1

堆栈跟踪: cn.itcast.Philosopher.run(TestDinner.java:48)
- 已锁定 cn.itcast.Chopstick@1540e19d (筷子1) 

------------------------------------------------------------------------- 
名称: 柏拉图
状态: cn.itcast.Chopstick@14ae5a5 (筷子3) 上的BLOCKED, 拥有者: 亚里士多德 
总阻止数: 2, 总等待数: 0

堆栈跟踪: cn.itcast.Philosopher.run(TestDinner.java:48)
- 已锁定 cn.itcast.Chopstick@677327b6 (筷子2)

------------------------------------------------------------------------- 
名称: 亚里士多德
状态: cn.itcast.Chopstick@7f31245a (筷子4) 上的BLOCKED, 拥有者: 赫拉克利特 
总阻止数: 1, 总等待数: 1

堆栈跟踪: cn.itcast.Philosopher.run(TestDinner.java:48)
- 已锁定 cn.itcast.Chopstick@14ae5a5 (筷子3) 

------------------------------------------------------------------------- 
名称: 赫拉克利特
状态: cn.itcast.Chopstick@6d6f6e28 (筷子5) 上的BLOCKED, 拥有者: 阿基米德 
总阻止数: 2, 总等待数: 0

堆栈跟踪: cn.itcast.Philosopher.run(TestDinner.java:48)
- 已锁定 cn.itcast.Chopstick@7f31245a (筷子4)
```

这种线程没有按预期结束，执行不下去的情况，归类为【活跃性】问题，除了死锁以外，还有活锁和饥饿者两种情况

#### 活锁

活锁出现在两个线程互相改变对方的结束条件，最后谁也无法结束，例如

```java
public class TestLiveLock {
static volatile int count = 10;
static final Object lock = new Object();

public static void main(String[] args) { 
  new Thread(() -> {
		// 期望减到 0 退出循环 
    while (count > 0) { 
      sleep(0.2);
			count--;
			log.debug("count: {}", count); 
    }
	}, "t1").start(); 
  
  new Thread(() -> {
      // 期望超过 20 退出循环 
      while (count < 20) { 
        sleep(0.2);
        count++;
        log.debug("count: {}", count); 
      }
    }, "t2").start(); 
	}
}
```

#### 饥饿

很多人把饥饿定义为，一个线程由于优先级太低，始终得不到 CPU 调度执行，也不能够结束，饥饿的情况不 易演示，后面读写锁时会涉及饥饿问题

下面一个线程饥饿的例子，先来看看使用顺序加锁的方式解决之前的死锁问题

```mermaid
sequenceDiagram
	  participant t1 as 线程1
	  participant t2 as 线程2
	  participant o1 as 对象A
	  participant o2 as 对象B
	  
	  t1 -->> o1:尝试获取锁
	  Note over t1,o1: 拥有锁
	  t2 -->> o2:尝试获取锁
	  Note over t2,o2: 拥有锁
	  t1 --x o2:尝试获取锁
	  t2 --x o1:尝试获取锁
```

顺序加锁的解决方案

```mermaid
sequenceDiagram
	  participant t1 as 线程1
	  participant t2 as 线程2
	  participant o1 as 对象A
	  participant o2 as 对象B
	  
	  t1 -->> o1:尝试获取锁
	  Note over t1,o1: 拥有锁
	  t2 --x o1:尝试获取锁
	  t2 -->> o1:阻塞
	  t1 -->> o2:尝试获取锁
	  Note over t1,o2: 拥有锁
```

然后这种顺序加锁的方案也可能会出现线程饥饿的问题。即某个线程一直能获取到锁，而其他线程则一直处于饥饿中等待锁

我们可以使用ReentrantLock来解决死锁，活锁，饥饿的问题

## ReentrantLock

> ReentrantLock是Java并发包下的类

相对于 synchronized 它具备如下特点

- 可中断

> 注意：这里的可中断是则别的线程可以破环某个线程的blocking状态，而不是拥有锁之后自己中断自己

- 可以设置超时时间
- 可以设置为公平锁
- 支持多个条件变量

> synchronized只有一个条件变量，即条件不满足时进入waitSet等待

与 synchronized 一样，都支持可重入

基本语法

```java
// 获取锁 
reentrantLock.lock(); 
try {
	// 临界区 
} finally {
	// 释放锁
	reentrantLock.unlock(); 
}
```

#### 可重入

- 可重入是指同一个线程如果首次获得了这把锁，那么因为它是这把锁的拥有者，因此有权利再次获取这把锁 
- 如果是不可重入锁，那么第二次获得锁时，自己也会被锁挡住

```java
static ReentrantLock lock = new ReentrantLock();

public static void main(String[] args) { 
  method1();
}

public static void method1() { 
  lock.lock();
	try {
		log.debug("execute method1"); 
    method2();
	} finally { 
    lock.unlock();
	} 
}

public static void method2() { 
  lock.lock();
	try {
		log.debug("execute method2"); 
    method3();
	} finally { 
    lock.unlock();
	} 
}

public static void method3() { 
  lock.lock();
	try {
		log.debug("execute method3");
	} finally { 
    lock.unlock();
	} 
}
```

输出

```java
17:59:11.862 [main] c.TestReentrant - execute method1
17:59:11.865 [main] c.TestReentrant - execute method2
17:59:11.865 [main] c.TestReentrant - execute method3
```

#### 可打断

lockInterruptibly 被动方式防止死锁的发生

```java
ReentrantLock lock = new ReentrantLock(); 

Thread t1 = new Thread(() -> {
  log.debug("启动..."); 
  try {
		lock.lockInterruptibly();
	} catch (InterruptedException e) {
		e.printStackTrace(); 
    log.debug("等锁的过程中被打断"); 
    return;
	} 
  
  try {
		log.debug("获得了锁"); 
  } finally {
		lock.unlock(); 
  }
}, "t1");

lock.lock(); 
log.debug("获得了锁"); 
t1.start();
try {
	sleep(1); 
  t1.interrupt(); 
  log.debug("执行打断");
} finally { 
  lock.unlock();
}
```

输出

```java
18:02:40.520 [main] c.TestInterrupt - 获得了锁 
18:02:40.524 [t1] c.TestInterrupt - 启动... 
18:02:41.530 [main] c.TestInterrupt - 执行打断 
  
java.lang.InterruptedException
		at java.util.concurrent.locks.AbstractQueuedSynchronizer.doAcquireInterruptibly(AbstractQueuedSynchr onizer.java:898)
		at java.util.concurrent.locks.AbstractQueuedSynchronizer.acquireInterruptibly(AbstractQueuedSynchron izer.java:1222)
		at java.util.concurrent.locks.ReentrantLock.lockInterruptibly(ReentrantLock.java:335) 
  	at cn.itcast.n4.reentrant.TestInterrupt.lambda$main$0(TestInterrupt.java:17)
		at java.lang.Thread.run(Thread.java:748)
18:02:41.532 [t1] c.TestInterrupt - 等锁的过程中被打断
```

注意如果是不可中断模式，那么即使使用了 interrupt 也不会让等待中断

```java
ReentrantLock lock = new ReentrantLock();

Thread t1 = new Thread(() -> { 
  log.debug("启动...");
	lock.lock(); 
  try {
		log.debug("获得了锁"); 
  } finally {
		lock.unlock(); 
  }
}, "t1");

lock.lock(); 
log.debug("获得了锁"); 
t1.start();
try {
	sleep(1); 
  t1.interrupt(); 
  log.debug("执行打断"); 
  sleep(1);
} finally { 
  log.debug("释放了锁"); 
  lock.unlock();
}
```

输出

```java
18:06:56.261 [main] c.TestInterrupt - 获得了锁
18:06:56.265 [t1] c.TestInterrupt - 启动...
18:06:57.266 [main] c.TestInterrupt - 执行打断 // 这时 t1 并没有被真正打断, 而是仍继续等待锁 
18:06:58.267 [main] c.TestInterrupt - 释放了锁
18:06:58.267 [t1] c.TestInterrupt - 获得了锁
```

#### 锁超时

主动方式防止死锁的发生

trylock 立刻失败：

```java
ReentrantLock lock = new ReentrantLock(); 

Thread t1 = new Thread(() -> {
	log.debug("启动..."); 
  if (!lock.tryLock()) {
		log.debug("获取立刻失败，返回");
		return; 
  }
  
	try { 
    log.debug("获得了锁");
	} finally { 
    lock.unlock();
	}
}, "t1");

lock.lock(); 
log.debug("获得了锁");
t1.start();
try {
	sleep(2); 
} finally {
	lock.unlock(); 
}
```

输出

```java
18:15:02.918 [main] c.TestTimeout - 获得了锁 
18:15:02.921 [t1] c.TestTimeout - 启动... 
18:15:02.921 [t1] c.TestTimeout - 获取立刻失败，返回
```

trylock 超时失败：

```java
ReentrantLock lock = new ReentrantLock(); 

Thread t1 = new Thread(() -> {
	log.debug("启动..."); 
  
  try {
		if (!lock.tryLock(1, TimeUnit.SECONDS)) { 
      log.debug("获取等待 1s 后失败，返回"); 
      return;
		}
	} catch (InterruptedException e) {
		e.printStackTrace(); 
  }
	
  try { 
    log.debug("获得了锁");
	} finally { 
    lock.unlock();
	}
}, "t1");

lock.lock(); 
log.debug("获得了锁"); 
t1.start();
try {
	sleep(2); 
} finally {
	lock.unlock(); 
}
```

输出

```java
18:19:40.537 [main] c.TestTimeout - 获得了锁
18:19:40.544 [t1] c.TestTimeout - 启动...
18:19:41.547 [t1] c.TestTimeout - 获取等待 1s 后失败，返回
```

使用 tryLock 解决哲学家就餐问题:

```java
class Chopstick extends ReentrantLock { 
  String name;

  public Chopstick(String name) { 
    this.name = name;
	}

  @Override
	public String toString() { 
    return "筷子{" + name + '}';
	} 
}
```

```java
class Philosopher extends Thread { 
  Chopstick left;
	Chopstick right;

  public Philosopher(String name, Chopstick left, Chopstick right) { 
    super(name);
		this.left = left;
		this.right = right; 
  }

  @Override
	public void run() { 
    while (true) {
      // 尝试获得左手筷子
      if (left.tryLock()) {
        try {
          // 尝试获得右手筷子
          if (right.tryLock()) {
            try { 
              eat();
            } finally { 
              right.unlock();
            } 
          }
        } finally { 
          left.unlock();
        } 
      }
		} 
  }
	
  private void eat() { 
    log.debug("eating..."); 
    Thread.sleep(1);
	} 
}
```

#### 公平锁

ReentrantLock 默认是不公平的

```java
ReentrantLock lock = new ReentrantLock(false);

lock.lock();
for (int i = 0; i < 500; i++) {
	new Thread(() -> { 
    lock.lock();
    try {
      System.out.println(Thread.currentThread().getName() + " running...");
    } finally { 
      lock.unlock();
    }
  }, "t" + i).start();
}

// 1s 之后去争抢锁 
Thread.sleep(1000); 

new Thread(() -> {
	System.out.println(Thread.currentThread().getName() + " start..."); 
  lock.lock();
	try {
		System.out.println(Thread.currentThread().getName() + " running..."); 
  } finally {
		lock.unlock(); 
  }
}, "强行插入").start(); 
lock.unlock();
```

强行插入，有机会在中间输出

> 注意：该实验不一定总能浮现

```java
t39 running...
t40 running...
t41 running...
t42 running...
t43 running... 
强行插入 start... 
强行插入 running... 
t44 running...
t45 running... 
t46 running... 
t47 running... 
t49 running...
```

改为公平锁后

```java
ReentrantLock lock = new ReentrantLock(true);
```

强行插入，总是在最后输出

```java
t465 running... 
t464 running... 
t477 running... 
t442 running... 
t468 running... 
t493 running... 
t482 running... 
t485 running... 
t481 running... 
强行插入 running...
```

公平锁一般没有必要，会降低并发度，后面分析原理时会讲解

#### 条件变量

synchronized 中也有条件变量，就是我们讲原理时那个 waitSet 休息室，当条件不满足时进入 waitSet 等待 

ReentrantLock 的条件变量比 synchronized 强大之处在于，它是支持多个条件变量的，这就好比

- synchronized 是那些不满足条件的线程都在一间休息室等消息
- 而 ReentrantLock 支持多间休息室，有专门等烟的休息室、专门等早餐的休息室、唤醒时也是按休息室来唤醒

使用要点:

- await 前需要获得锁
- await 执行后，会释放锁，进入 conditionObject 等待 
- await 的线程被唤醒(或打断、或超时)取重新竞争 lock 锁
- 竞争 lock 锁成功后，从 await 后继续执行

例子：

```java
static ReentrantLock lock = new ReentrantLock();

static Condition waitCigaretteQueue = lock.newCondition(); 
static Condition waitbreakfastQueue = lock.newCondition(); 
static volatile boolean hasCigrette = false;
static volatile boolean hasBreakfast = false;

public static void main(String[] args) { 
  new Thread(() -> {
    try { 
      lock.lock();
      while (!hasCigrette) {
        try { 
          waitCigaretteQueue.await();
        } catch (InterruptedException e) { 
          e.printStackTrace();
        } 
      }
      log.debug("等到了它的烟"); 
    } finally {
      lock.unlock(); 
    }
  }).start();
  
	new Thread(() -> { 
    try {
			lock.lock();
			while (!hasBreakfast) {
				try { 
          waitbreakfastQueue.await();
				} catch (InterruptedException e) { 
          e.printStackTrace();
				} 
      }
			log.debug("等到了它的早餐"); 
    } finally {
			lock.unlock(); 
    }
	}).start();
  
	sleep(1); 
  sendBreakfast(); 
  sleep(1); 
  sendCigarette();
}

private static void sendCigarette() { 
  lock.lock();
	try {
		log.debug("送烟来了"); 
    hasCigrette = true; 
    waitCigaretteQueue.signal();
	} finally { 
    lock.unlock();
	} 
}

private static void sendBreakfast() { 
  lock.lock();
	try {
		log.debug("送早餐来了"); 
    hasBreakfast = true; 
    waitbreakfastQueue.signal();
	} finally { 
    lock.unlock();
	}
}
```

输出

```java
18:52:27.680 [main] c.TestCondition - 送早餐来了 
18:52:27.682 [Thread-1] c.TestCondition - 等到了它的早餐 
18:52:28.683 [main] c.TestCondition - 送烟来了 
18:52:28.683 [Thread-0] c.TestCondition - 等到了它的烟
```

## 同步模式之顺序控制

### 固定运行顺序

比如，必须先 2 后 1

#### wait notify版

```java
// 用来同步的对象
static Object obj = new Object(); 
// t2 运行标记， 代表 t2 是否执行过 
static boolean t2runed = false;

public static void main(String[] args) {
	Thread t1 = new Thread(() -> { 
    synchronized (obj) {
			// 如果 t2 没有执行过 
      while (!t2runed) {
				try {
					// t1 先等一会
					obj.wait();
				} catch (InterruptedException e) {
					e.printStackTrace();
 			 	} 
      }
		}
		System.out.println(1); 
  });
  
  Thread t2 = new Thread(() -> { 
    System.out.println(2); 
    synchronized (obj) {
			// 修改运行标记
			t2runed = true;
			// 通知 obj 上等待的线程(可能有多个，因此需要用 notifyAll) 
      obj.notifyAll();
		} 
  });
  
	t1.start();
	t2.start(); 
}
```

#### Park Unpark版

可以看到，实现上很麻烦:

- 首先，需要保证先 wait 再 notify，否则 wait 线程永远得不到唤醒。因此使用了『运行标记』来判断该不该 wait
- 第二，如果有些干扰线程错误地 notify 了 wait 线程，条件不满足时还要重新等待，使用了 while 循环来解决 此问题
- 最后，唤醒对象上的 wait 线程需要使用 notifyAll，因为『同步对象』上的等待线程可能不止一个 可以使用 LockSupport 类的 park 和 unpark 来简化上面的题目:

```java
Thread t1 = new Thread(() -> {
	try { 
    Thread.sleep(1000); 
  } catch (InterruptedException e) { 
  
  }  
	// 当没有『许可』时，当前线程暂停运行;有『许可』时，用掉这个『许可』，当前线程恢复运行
  LockSupport.park();
	System.out.println("1");
});

Thread t2 = new Thread(() -> {
	System.out.println("2");
	// 给线程 t1 发放『许可』(多次连续调用 unpark 只会发放一个『许可』) 
  LockSupport.unpark(t1);
});

t1.start();
t2.start();
```

park 和 unpark 方法比较灵活，他俩谁先调用，谁后调用无所谓。并且是以线程为单位进行『暂停』和『恢复』， 不需要『同步对象』和『运行标记』

### 交替输出

线程 1 输出 a 5 次，线程 2 输出 b 5 次，线程 3 输出 c 5 次。现在要求输出 abcabcabcabcabc 怎么实现

#### wait notify版

```java
class SyncWaitNotify { 
  private int flag; 
  private int loopNumber;

  public SyncWaitNotify(int flag, int loopNumber) { 
    this.flag = flag;
		this.loopNumber = loopNumber;
	}

  public void print(int waitFlag, int nextFlag, String str) { 
    for (int i = 0; i < loopNumber; i++) {
      synchronized (this) {
				while (this.flag != waitFlag) {
					try { 
            this.wait();
					} catch (InterruptedException e) { 
            e.printStackTrace();
					} 
        }
				System.out.print(str); 
        flag = nextFlag; 
        this.notifyAll();
			} 
    }
	} 
}
```

```java
SyncWaitNotify syncWaitNotify = new SyncWaitNotify(1, 5); 

new Thread(() -> {
	syncWaitNotify.print(1, 2, "a"); 
}).start();

new Thread(() -> { 
  syncWaitNotify.print(2, 3, "b");
}).start();

new Thread(() -> {
	syncWaitNotify.print(3, 1, "c"); 
}).start();
```

#### Lock 条件变量版

```java
class AwaitSignal extends ReentrantLock { 
  public void start(Condition first) {
		this.lock();
   	try { 
      log.debug("start"); 
      first.signal();
		} finally { 
      this.unlock();
		} 
  }

  public void print(String str, Condition current, Condition next) { 
    for (int i = 0; i < loopNumber; i++) {
			this.lock();
      try {
				current.await(); 
        log.debug(str); 
        next.signal();
			} catch (InterruptedException e) { 
        e.printStackTrace();
			} finally { 
        this.unlock();
			} 
    }
	}
	// 循环次数
	private int loopNumber;

  public AwaitSignal(int loopNumber) { 
    this.loopNumber = loopNumber;
	}
}
```

```java
AwaitSignal as = new AwaitSignal(5); 
Condition aWaitSet = as.newCondition(); 
Condition bWaitSet = as.newCondition(); 
Condition cWaitSet = as.newCondition();

new Thread(() -> {
	as.print("a", aWaitSet, bWaitSet);
}).start();

new Thread(() -> {
	as.print("b", bWaitSet, cWaitSet); 
}).start();

new Thread(() -> {
	as.print("c", cWaitSet, aWaitSet);
}).start(); 

as.start(aWaitSet);
```

> 注意：该实现没有考虑 a，b，c 线程都就绪再开始

#### Park Unpark版

```java
class SyncPark {
	private int loopNumber; 
  private Thread[] threads;

  public SyncPark(int loopNumber) { 
    this.loopNumber = loopNumber;
	}

  public void setThreads(Thread... threads) { 
    this.threads = threads;
	}

  public void print(String str) {
		for (int i = 0; i < loopNumber; i++) {
			LockSupport.park(); 
      System.out.print(str); 
      LockSupport.unpark(nextThread());
		} 
  }

  private Thread nextThread() {
    Thread current = Thread.currentThread(); 
    int index = 0;
		for (int i = 0; i < threads.length; i++) {
			if(threads[i] == current) { 
        index = i;
				break; 
      }
		}
		if(index < threads.length - 1) {
			return threads[index+1]; 
    } else {
			return threads[0]; 
    }
	}

  public void start() {
		for (Thread thread : threads) {
			thread.start(); 
    }
		LockSupport.unpark(threads[0]); 
  }
}
```

```java
SyncPark syncPark = new SyncPark(5); 

Thread t1 = new Thread(() -> {
	syncPark.print("a"); 
});

Thread t2 = new Thread(() -> { 
  syncPark.print("b");
});

Thread t3 = new Thread(() -> {
	syncPark.print("c\n"); 
});

syncPark.setThreads(t1, t2, t3); 
syncPark.start();
```

## 总结

重点掌握的是

- 分析多线程访问共享资源时，哪些代码片段属于临界区 
- 使用 synchronized 互斥解决临界区的线程安全问题
  - 掌握 synchronized 锁对象语法
  - 掌握 synchronzied 加载成员方法和静态方法语法 
  - 掌握 wait/notify 同步方法

- 使用 lock 互斥解决临界区的线程安全问题
- 掌握 lock 的使用细节:可打断、锁超时、公平锁、条件变量

- 学会分析变量的线程安全性、掌握常见线程安全类的使用
- 了解线程活跃性问题:死锁、活锁、饥饿
- 应用方面
  - 互斥：使用 synchronized 或 Lock 达到共享资源互斥效果 
  - 同步：使用 wait/notify 或 Lock 的条件变量来达到线程间通信效果

- 原理方面
  - monitor、synchronized 、wait/notify 原理 
  - synchronized 进阶原理（见下一章）
  - park & unpark 原理

- 模式方面
  - 同步模式之保护性暂停
  - 异步模式之生产者消费者
  - 同步模式之顺序控制