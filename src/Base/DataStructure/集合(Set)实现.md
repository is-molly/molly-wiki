---
order: 6
date: 2024-04-08
---
# 集合(Set)实现

## 集合的特点

不存放重复的元素

常用于去重

- 存放新增 IP，统计新增 IP 量

- 存放词汇，统计词汇量

集合的内部实现能直接使用 `动态数组`，`链表`，`二叉搜索树(AVL树，红黑树) `实现

## 接口设计

```java
/**
 * @Description 集合Set的接口
 * @author Polaris
 * @version
 * @date 2020年3月11日下午9:30:36
 */
public interface Set<E> {
	int size();
	boolean isEmpty();
	void clear();
	boolean contains(E element);
	void add(E element);
	void remove(E element);
	void traversal(Visitor<E> visitor);
	
	/**
	 * 注意：动态数组或链表有索引的概念能直接for循环遍历，不需要遍历接口
	 */
	public static abstract class Visitor<E> {
		boolean stop;
		public abstract boolean visit(E element);
	}
}
```

## 链表实现集合(ListSet)

### 实现

```java
public class ListSet<E> implements Set<E> {
	private List<E> list = new LinkedList<E>();
	
	@Override
	public int size() {
		return list.size();
	}

	@Override
	public boolean isEmpty() {
		return list.isEmpty();
	}

	@Override
	public void clear() {
		list.clear();
	}

	@Override
	public boolean contains(E element) {
		return list.contains(element);
	}

	@Override
	public void add(E element) {
		//集合Set存储不重复的元素
		if(list.contains(element)) return;
		list.add(element);
	}

	@Override
	public void remove(E element) {
		int index = list.indexOf(element);
		if(index != -1) {
			list.remove(index);
		}
	}

	@Override
	public void traversal(Visitor<E> visitor) {
		if(visitor == null) return;
		int size = list.size();
		for(int i = 0;i < size;i++) {
			if(visitor.visit(list.get(i))) return;
		}
	}

}
```

### 测试

```java
public class ListSetTest {
	@Test
	public void test() {
		Set<Integer> listSet = new ListSet<>();
		listSet.add(10);
		listSet.add(11);
		listSet.add(11);
		listSet.add(12);
		listSet.add(7);
		listSet.remove(11);
		listSet.traversal(new Visitor<Integer>() {
			@Override
			public boolean visit(Integer element) {
				System.out.println(element);
				return false;
			}
		});

	}
}
```

## 红黑树实现集合(TreeSet)

### ListSet 与 TreeSet效率对比

**链表**

- 查找：最坏情况为O(n)级别

- 添加：最坏情况为O(n)级别

- 删除：最坏情况为O(n)级别

**红黑树**

- 查找：最坏情况为O(logn)级别

- 添加：最坏情况为O(logn)级别

- 删除：最坏情况为O(logn)级别

### TreeSet 的局限性

通过二叉搜索树实现的TreeSet，元素必须具备 可比较性 才能加进去

通过 `哈希表` 实现的 HashSet，可以解决这个局限性

### 实现

```java
public class TreeSet<E> implements Set<E>{
	private RBTree<E> tree;
	
	public TreeSet() {
		this(null);
	}
	
	public TreeSet(Comparator<E> comparator) {
		tree = new RBTree<>(comparator);
	}
	
	@Override
	public int size() {
		return tree.size();
	}

	@Override
	public boolean isEmpty() {
		return tree.isEmpty();
	}

	@Override
	public void clear() {
		tree.clear();
	}

	@Override
	public boolean contains(E element) {
		return tree.contains(element);
	}

	@Override
	public void add(E element) {
		tree.add(element);
	}

	@Override
	public void remove(E element) {
		tree.remove(element);
	}

	@Override
	public void traversal(Visitor<E> visitor) {
		tree.inorderTraversal(new BinaryTree.Visitor<E>() {
			@Override
			public boolean visit(E element) {
				return visitor.visit(element);
			}
			
		});
	}

}
```

### 测试

```java
public class TreeSetTest {
	@Test
	public void test() {
		Set<Person> treeSet = new TreeSet<>(new Comparator<Person>() {
			@Override
			public int compare(Person o1, Person o2) {
				Person p1 = (Person)o1;
				Person p2 = (Person)o2;
				return p1.getAge() - p2.getAge();
			}
		});
		treeSet.add(new Person(10));
		treeSet.add(new Person(12));
		treeSet.add(new Person(10));
		treeSet.add(new Person(7));
		treeSet.traversal(new Visitor<Person>() {
			@Override
			public boolean visit(Person element) {
				System.out.println(element.getAge());
				return false;
			}
		});

	}
}

class Person {
	private int age;

	public Person(int age) {
		super();
		this.age = age;
	}

	public int getAge() {
		return age;
	}

	public void setAge(int age) {
		this.age = age;
	}
	
}
```